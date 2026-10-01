import { beforeAll, describe, expect, it } from 'vitest';
import {
	api,
	json,
	signUpAndSignIn,
	sql,
	startFreshDemo,
	type DemoUser,
	type TestUser
} from './helpers';

/**
 * The demo-account reaper (PORT-PLAN, Phase 6). Its predicate is deliberately narrow:
 * `roles` contains DEMO **and** no passkey **and** older than the window. Each clause
 * is what stops a real person's account from being deleted by a scheduled job, so one
 * demo account is walked through the states in order — fresh, old with a passkey, old
 * without — and the assertions are made in Postgres, not from the response, because
 * "reaped: 1" says nothing about *which* row went.
 *
 * `CRON_SECRET` is exported by `tests/run.sh`, so the server and this file agree on it.
 */

const SECRET = process.env.CRON_SECRET ?? '';
const REAP = '/api/cron/reap-demos';

const TEMPLATE = 'creed.bratton@dundermifflin.com';

const reap = (authorization?: string) =>
	fetch(`${process.env.TEST_BASE}${REAP}`, {
		headers: authorization === undefined ? {} : { authorization }
	});

const reapCount = async () =>
	(await json<{ reaped: number }>(await reap(`Bearer ${SECRET}`))).reaped;

const userExists = async (id: string) =>
	(await sql(`select count(*) from "user" where id = '${id}'`)) === '1';

const backdate = (id: string, days: number) =>
	sql(`update "user" set created_at = now() - interval '${days} days' where id = '${id}'`);

describe(REAP, () => {
	let demo: DemoUser;
	let real: TestUser;

	beforeAll(async () => {
		// Vitest isolates modules per file, so every file mints its own "shared" demo and
		// this one would be the fourth against a limit of three. The demo limiter is not
		// what this file tests, so its bucket is cleared rather than worked around.
		await sql(`delete from auth_rate_limits where key like 'demo:%'`);
		demo = await startFreshDemo();
		real = await signUpAndSignIn();
		await backdate(real.id, 30);
		// The template is a demo-role account with no passkey, and in production it is
		// as old as the last seed. Every reap in this file runs with it long past the
		// window, because that is the state in which it was once deleted.
		await sql(
			`update "user" set created_at = now() - interval '30 days' where email = '${TEMPLATE}'`
		);
	});

	it('refuses a request without the secret', async () => {
		expect((await reap()).status).toBe(401);
		expect((await reap('Bearer not-the-secret')).status).toBe(401);
	});

	it('leaves a fresh demo and an old real account alone', async () => {
		const response = await reap(`Bearer ${SECRET}`);
		expect(response.status).toBe(200);

		expect(await userExists(demo.id)).toBe(true);
		expect(await userExists(real.id)).toBe(true);
	});

	it('keeps an old demo while a passkey is attached', async () => {
		await backdate(demo.id, 30);
		// A passkey is what conversion attaches; while one exists the row is a person's.
		await sql(
			`insert into passkey (id, name, public_key, user_id, credential_id, counter, device_type, backed_up)
			 values ('pk-${demo.id}', 'test', 'pk', '${demo.id}', 'cred-${demo.id}', 0, 'singleDevice', false)`
		);

		expect(await reapCount()).toBe(0);
		expect(await userExists(demo.id)).toBe(true);
	});

	it('reaps an old demo without one, garage and session included', async () => {
		await sql(`delete from passkey where user_id = '${demo.id}'`);

		expect(await reapCount()).toBe(1);

		expect(await userExists(demo.id)).toBe(false);
		expect(await sql(`select count(*) from vehicles where user_id = '${demo.id}'`)).toBe('0');
		expect(await sql(`select count(*) from session where user_id = '${demo.id}'`)).toBe('0');
		expect((await api('/api/vehicles', { cookie: demo.cookie })).status).toBe(401);

		expect(await userExists(real.id)).toBe(true);
	});

	it('never reaps the template every demo is cloned from', async () => {
		expect(await sql(`select count(*) from "user" where email = '${TEMPLATE}'`)).toBe('1');

		// And so a demo can still be started after any number of reaps.
		await sql(`delete from auth_rate_limits where key like 'demo:%'`);
		const again = await startFreshDemo();
		expect(await sql(`select count(*) from vehicles where user_id = '${again.id}'`)).toBe('3');
	});

	it('sweeps up an anonymous account whose demo was never finished', async () => {
		await sql(
			`insert into "user" (id, name, email, email_verified, roles, is_anonymous, created_at, updated_at)
			 values ('leftover-anon', 'Anonymous', 'leftover@anonymous.placeholder.invalid', false, '{}', true, now() - interval '30 days', now())`
		);

		expect(await reapCount()).toBe(1);
		expect(await userExists('leftover-anon')).toBe(false);
	});
});
