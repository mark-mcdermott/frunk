import { generateSync } from 'otplib';
import { describe, expect, it } from 'vitest';
import { api, fakeAddress, json, signUpAndSignIn, sql, TEST_PASSWORD } from './helpers';

/**
 * The bundled native app is a different origin from the site, so everything it does is
 * cross-origin: CORS preflights, a bearer token instead of the session cookie, and a
 * header relay for the short-lived cookies three of Better Auth's flows depend on
 * (`src/middleware.ts`, `src/lib/server/relay.ts`). A webview enforces all of this and
 * a test cannot be a webview — but every rule is a header, and headers are what this
 * file sends.
 */

const APP = 'capacitor://localhost';
const RELAY = 'x-frunk-relay';

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

/** Signs in the way the app does: from its own origin, with no cookie jar. */
async function signInFromApp(email: string, ip = fakeAddress()) {
	return api('/api/auth/sign-in/email', {
		method: 'POST',
		body: { email, password: TEST_PASSWORD },
		origin: APP,
		ip
	});
}

describe('CORS', () => {
	it('answers a preflight from the app and names what the app may read', async () => {
		const preflight = await api('/api/vehicles', {
			method: 'OPTIONS',
			origin: APP,
			headers: {
				'access-control-request-method': 'DELETE',
				'access-control-request-headers': 'authorization, content-type'
			}
		});
		expect(preflight.status).toBe(204);
		expect(preflight.headers.get('access-control-allow-origin')).toBe(APP);
		expect(preflight.headers.get('access-control-allow-methods')).toContain('DELETE');
		expect(preflight.headers.get('access-control-allow-headers')).toBe(
			'authorization, content-type'
		);
		// Credential-less by design: the app has a token, not a cookie.
		expect(preflight.headers.get('access-control-allow-credentials')).toBeNull();

		const refused = await api('/api/vehicles', { origin: APP });
		expect(refused.status).toBe(401);
		expect(refused.headers.get('access-control-allow-origin')).toBe(APP);
		expect(refused.headers.get('access-control-expose-headers')).toContain('set-auth-token');
	});

	it('says nothing to any other origin', async () => {
		const stranger = await api('/api/vehicles', { origin: 'https://evil.example' });
		expect(stranger.status).toBe(401);
		expect(stranger.headers.get('access-control-allow-origin')).toBeNull();
	});
});

describe('the cross-site form check', () => {
	it('still refuses a body-less mutation from another site, and a form post', async () => {
		const alice = await signUpAndSignIn();

		const bodyless = await api('/api/vehicles/not-a-real-id', {
			method: 'DELETE',
			cookie: alice.cookie,
			origin: 'https://evil.example'
		});
		expect(bodyless.status).toBe(403);

		const form = await fetch(`${process.env.TEST_BASE}/api/vehicles`, {
			method: 'POST',
			headers: {
				Origin: 'https://evil.example',
				'content-type': 'application/x-www-form-urlencoded',
				cookie: alice.cookie
			},
			body: 'make=AMC&model=Gremlin&year=1974'
		});
		expect(form.status).toBe(403);
		expect(await sql(`select count(*) from vehicles where user_id = '${alice.id}'`)).toBe('0');
	});

	it('lets the same request through from the site itself and from the app', async () => {
		const alice = await signUpAndSignIn();

		// Same origin: reaches the handler, which says the row does not exist.
		const own = await api('/api/vehicles/not-a-real-id', {
			method: 'DELETE',
			cookie: alice.cookie
		});
		expect(own.status).toBe(404);

		const signedIn = await signInFromApp(alice.email);
		const token = signedIn.headers.get('set-auth-token') ?? '';
		const fromApp = await api('/api/vehicles/not-a-real-id', {
			method: 'DELETE',
			origin: APP,
			headers: bearer(token)
		});
		expect(fromApp.status).toBe(404);
	});
});

describe('a bearer session', () => {
	it('is handed out on sign-in and is the whole session', async () => {
		const alice = await signUpAndSignIn();

		const signedIn = await signInFromApp(alice.email);
		expect(signedIn.status).toBe(200);
		const token = signedIn.headers.get('set-auth-token');
		expect(token).toBeTruthy();
		// The session cookie is not relayed: the token is the one source of it.
		expect(signedIn.headers.get(RELAY) ?? '').not.toContain('session_token');

		const created = await api('/api/vehicles', {
			method: 'POST',
			body: { make: 'AMC', model: 'Gremlin', year: 1974 },
			origin: APP,
			headers: bearer(token ?? '')
		});
		expect(created.status).toBe(201);
		expect(await sql(`select count(*) from vehicles where user_id = '${alice.id}'`)).toBe('1');

		const anonymous = await api('/api/vehicles', { origin: APP });
		expect(anonymous.status).toBe(401);

		const signedOut = await api('/api/auth/sign-out', {
			method: 'POST',
			body: {},
			origin: APP,
			headers: bearer(token ?? '')
		});
		expect(signedOut.status).toBe(200);
		expect((await api('/api/vehicles', { origin: APP, headers: bearer(token ?? '') })).status).toBe(
			401
		);
	});

	it('opens a demo for the app the same way', async () => {
		await sql(`delete from auth_rate_limits where key like 'demo:%'`);

		const demo = await api('/api/demo', { method: 'POST', body: {}, origin: APP });
		expect(demo.status).toBe(200);
		const token = demo.headers.get('set-auth-token') ?? '';
		expect(token).not.toBe('');
		expect(demo.headers.get('access-control-expose-headers')).toContain('set-auth-token');

		const { vehicles } = await json<{ vehicles: unknown[] }>(
			await api('/api/vehicles', { origin: APP, headers: bearer(token) })
		);
		expect(vehicles).toHaveLength(3);
	});
});

describe('the cookie relay', () => {
	it('carries a recovery sign-in across its two requests', async () => {
		const alice = await signUpAndSignIn();
		const ip = fakeAddress();

		// Enrol recovery from the app: the secret comes back, a code confirms it.
		const first = await signInFromApp(alice.email, ip);
		const token = first.headers.get('set-auth-token') ?? '';
		const enabled = await api('/api/auth/two-factor/enable', {
			method: 'POST',
			body: { password: TEST_PASSWORD },
			origin: APP,
			headers: bearer(token)
		});
		expect(enabled.status).toBe(200);
		const { totpURI } = await json<{ totpURI: string }>(enabled);
		const secret = new URL(totpURI).searchParams.get('secret') ?? '';
		expect(secret).not.toBe('');

		const confirmed = await api('/api/auth/two-factor/verify-totp', {
			method: 'POST',
			body: { code: generateSync({ secret }) },
			origin: APP,
			headers: bearer(token)
		});
		expect(confirmed.status).toBe(200);

		// Now a password alone is answered with a challenge, and the challenge is a cookie.
		const challenged = await signInFromApp(alice.email, ip);
		expect(challenged.status).toBe(200);
		expect(await json(challenged)).toMatchObject({ twoFactorRedirect: true });
		expect(challenged.headers.get('set-auth-token')).toBeNull();
		const relay = challenged.headers.get(RELAY) ?? '';
		expect(relay).toContain('two_factor=');
		expect(challenged.headers.get('access-control-expose-headers')).toContain(RELAY);

		// Without the relayed cookie the code has nothing to answer.
		const cold = await api('/api/auth/two-factor/verify-totp', {
			method: 'POST',
			body: { code: generateSync({ secret }) },
			origin: APP,
			ip
		});
		expect(cold.status).toBe(401);

		const verified = await api('/api/auth/two-factor/verify-totp', {
			method: 'POST',
			body: { code: generateSync({ secret }), trustDevice: true },
			origin: APP,
			ip,
			headers: { [RELAY]: relay }
		});
		expect(verified.status).toBe(200);
		const session = verified.headers.get('set-auth-token') ?? '';
		expect(session).not.toBe('');
		// "Trust this device" is a cookie too, and comes back the same way.
		expect(verified.headers.get(RELAY) ?? '').toContain('trust_device=');

		expect((await api('/api/vehicles', { origin: APP, headers: bearer(session) })).status).toBe(
			200
		);
	});

	it('is ignored from the site itself, where real cookies do the job', async () => {
		const alice = await signUpAndSignIn();
		const signedIn = await api('/api/auth/sign-in/email', {
			method: 'POST',
			body: { email: alice.email, password: TEST_PASSWORD },
			ip: fakeAddress()
		});
		expect(signedIn.status).toBe(200);
		expect(signedIn.headers.get(RELAY)).toBeNull();
	});
});
