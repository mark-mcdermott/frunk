import { beforeAll, describe, expect, it } from 'vitest';
import {
	api,
	cookieJar,
	json,
	signUpAndSignIn,
	sql,
	startFreshDemo,
	TEST_PASSWORD,
	type DemoUser
} from './helpers';

/**
 * Decision 5's other door. "Keep my data" once pointed at email sign-up, and Better
 * Auth's sign-up always mints a *second* account, so the garage could only be left
 * behind. Worse: the anonymous plugin then treated the next sign-in from that browser
 * as a link and deleted the demo account, garage included — reproduced 2026-09-20 as
 * three vehicles, then none, with the new account empty.
 *
 * Two guards hold now, both asserted in Postgres rather than from the response: an
 * email sign-up from a demo session is refused outright, and no auth ceremony ever
 * deletes a demo account — retiring one is the reaper's job (`tests/reaper.test.ts`).
 */

const garage = (id: string) => sql(`select count(*) from vehicles where user_id = '${id}'`);
const account = (id: string) =>
	sql(`select roles::text || '|' || is_anonymous from "user" where id = '${id}'`);

describe('a demo account meets email sign-in', () => {
	let demo: DemoUser;
	let vehicles: string;

	beforeAll(async () => {
		// Same reason as reaper.test.ts: every file mints its own demo against a limit of three.
		await sql(`delete from auth_rate_limits where key like 'demo:%'`);
		demo = await startFreshDemo();
		vehicles = await garage(demo.id);
		expect(Number(vehicles)).toBeGreaterThan(0);
	});

	it('refuses an email sign-up from a demo session and leaves the garage alone', async () => {
		const email = `convert-${Date.now()}@example.com`;

		const refused = await api('/api/auth/sign-up/email', {
			method: 'POST',
			body: { email, password: TEST_PASSWORD, name: 'Demo Visitor' },
			cookie: demo.cookie
		});
		expect(refused.status).toBe(409);
		expect((await json<{ message: string }>(refused)).message).toMatch(/passkey/);

		expect(await sql(`select count(*) from "user" where email = '${email}'`)).toBe('0');
		expect(await account(demo.id)).toBe('{1}|true');
		expect(await garage(demo.id)).toBe(vehicles);
		// The session the refusal came back on is still the demo's, still working.
		expect((await api('/api/vehicles', { cookie: demo.cookie })).status).toBe(200);
	});

	it('keeps a demo account intact when its browser signs in to another account', async () => {
		const real = await signUpAndSignIn();

		const signedIn = await api('/api/auth/sign-in/email', {
			method: 'POST',
			body: { email: real.email, password: TEST_PASSWORD },
			cookie: demo.cookie
		});
		expect(signedIn.status).toBe(200);

		const session = await json<{ user: { id: string } }>(
			await api('/api/auth/get-session', { cookie: cookieJar(signedIn) })
		);
		expect(session.user.id, 'the browser is now in the other account').toBe(real.id);

		// Untouched: still a demo, still the reaper's to retire, garage and all.
		expect(await account(demo.id)).toBe('{1}|true');
		expect(await garage(demo.id)).toBe(vehicles);
		expect((await api('/api/vehicles', { cookie: demo.cookie })).status).toBe(200);
	});
});
