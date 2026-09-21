import { beforeAll, describe, expect, it } from 'vitest';
import {
	api,
	fakeAddress,
	json,
	signUpAndSignIn,
	sql,
	startFreshDemo,
	TEST_PASSWORD,
	type DemoUser,
	type TestUser
} from './helpers';

/**
 * The account-settings pass — Decision 5's loose end. A kept demo carried a placeholder
 * address and no password, so recovery could never be enrolled. Now the address can be
 * changed (Better Auth's `change-email`, applied at once while the current one is
 * unverified) and a password set (`POST /api/account/password`, the door to Better
 * Auth's server-only `setPassword`). Walked here in order on one converted account, with
 * each step checked in Postgres: address, password, verification, sign-in, recovery.
 *
 * The passkey ceremony itself needs a browser, so conversion is done the way the reaper
 * test does it — a passkey row and the role flip written by hand — which is exactly
 * what the server-side hook writes.
 */

const ACCOUNT = '/api/account';
const PASSWORD = '/api/account/password';

const userRow = (id: string) =>
	sql(`select email || '|' || email_verified || '|' || name from "user" where id = '${id}'`);
const credential = (id: string) =>
	sql(
		`select count(*) from account where user_id = '${id}' and provider_id = 'credential' and password is not null`
	);

describe(ACCOUNT, () => {
	let real: TestUser;

	beforeAll(async () => {
		real = await signUpAndSignIn();
	});

	it('refuses an anonymous request', async () => {
		expect((await api(ACCOUNT)).status).toBe(401);
		expect(
			(await api(PASSWORD, { method: 'POST', body: { password: TEST_PASSWORD } })).status
		).toBe(401);
	});

	it('knows a password account has a password and no passkeys', async () => {
		const response = await api(ACCOUNT, { cookie: real.cookie });
		expect(response.status).toBe(200);
		expect(await json(response)).toEqual({ hasPassword: true, passkeys: 0 });
	});

	it('will not set a second password', async () => {
		const response = await api(PASSWORD, {
			method: 'POST',
			body: { password: 'another-perfectly-fine-password' },
			cookie: real.cookie
		});
		expect(response.status).toBe(409);
		expect(await credential(real.id)).toBe('1');
	});
});

describe('keeping a demo account', () => {
	let demo: DemoUser;
	const email = `kept-${Date.now()}@example.com`;
	const password = 'a-password-chosen-after-keeping';

	beforeAll(async () => {
		// Same reason as reaper.test.ts: every file mints its own demo against a limit of three.
		await sql(`delete from auth_rate_limits where key like 'demo:%'`);
		demo = await startFreshDemo();
	});

	it('refuses a password while the account is still a demo', async () => {
		const response = await api(PASSWORD, {
			method: 'POST',
			body: { password },
			cookie: demo.cookie
		});
		expect(response.status).toBe(403);
		expect(await credential(demo.id)).toBe('0');
	});

	it('takes an address the moment the placeholder is replaced, unverified', async () => {
		// The passkey ceremony needs a browser; this is what its server-side hook leaves behind.
		await sql(
			`insert into passkey (id, name, public_key, user_id, credential_id, counter, device_type, backed_up)
			 values ('pk-${demo.id}', '${email}', 'pk', '${demo.id}', 'cred-${demo.id}', 0, 'singleDevice', false)`
		);
		await sql(`update "user" set roles = '{2}', is_anonymous = false where id = '${demo.id}'`);

		const changed = await api('/api/auth/change-email', {
			method: 'POST',
			body: { newEmail: email, callbackURL: '/profile' },
			cookie: demo.cookie
		});
		expect(changed.status).toBe(200);
		expect(await userRow(demo.id)).toBe(`${email}|false|Anonymous`);

		const account = await json<{ hasPassword: boolean; passkeys: number }>(
			await api(ACCOUNT, { cookie: demo.cookie })
		);
		expect(account).toEqual({ hasPassword: false, passkeys: 1 });
	});

	it('sets a password once, then refuses another', async () => {
		const set = await api(PASSWORD, { method: 'POST', body: { password }, cookie: demo.cookie });
		expect(set.status).toBe(204);
		expect(await credential(demo.id)).toBe('1');

		const again = await api(PASSWORD, { method: 'POST', body: { password }, cookie: demo.cookie });
		expect(again.status).toBe(409);

		const short = await api(PASSWORD, {
			method: 'POST',
			body: { password: 'short' },
			cookie: demo.cookie
		});
		expect(short.status).toBe(422);
	});

	it('signs in with the password only once the address is verified, then can enrol recovery', async () => {
		const ip = fakeAddress();
		const signIn = () =>
			api('/api/auth/sign-in/email', { method: 'POST', body: { email, password }, ip });

		expect((await signIn()).status).toBe(403);

		await sql(`update "user" set email_verified = true where id = '${demo.id}'`);
		const signedIn = await signIn();
		expect(signedIn.status).toBe(200);
		expect((await json<{ user: { id: string } }>(signedIn)).user.id).toBe(demo.id);

		const enable = await api('/api/auth/two-factor/enable', {
			method: 'POST',
			body: { password },
			cookie: demo.cookie
		});
		expect(enable.status).toBe(200);
		expect((await json<{ totpURI: string }>(enable)).totpURI).toMatch(/^otpauth:\/\/totp\//);
	});
});
