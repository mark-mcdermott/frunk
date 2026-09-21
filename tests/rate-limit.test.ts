import { describe, expect, it } from 'vitest';
import { api, fakeAddress, signUpAndSignIn, sql, TEST_PASSWORD } from './helpers';

/**
 * Better Auth's request limiter, backed by Postgres (`rate_limit`) so the count is one
 * per client address across every function instance rather than one per instance.
 * Asserted from both sides: the 429 the eleventh guess gets, and the row in the table
 * that made it happen — the memory store this replaces would leave no row at all.
 */
const SIGN_IN = '/api/auth/sign-in/email';

describe('Better Auth rate limiting', () => {
	it('stops the eleventh password guess in a minute from one address', async () => {
		const { email } = await signUpAndSignIn();
		const ip = fakeAddress();
		const guess = () => api(SIGN_IN, { method: 'POST', body: { email, password: 'not-it' }, ip });

		for (let attempt = 1; attempt <= 10; attempt++) expect((await guess()).status).toBe(401);

		const blocked = await guess();
		expect(blocked.status).toBe(429);
		expect(Number(blocked.headers.get('x-retry-after'))).toBeGreaterThan(0);

		// The count lives in Postgres, keyed by address and path — not in one instance's memory.
		expect(await sql(`select count from rate_limit where key = '${ip}|/sign-in/email'`)).toBe('10');

		// Another address is another bucket, and the right password still works from it.
		const elsewhere = await api(SIGN_IN, {
			method: 'POST',
			body: { email, password: TEST_PASSWORD },
			ip: fakeAddress()
		});
		expect(elsewhere.status).toBe(200);
	});

	it('caps verification mail at five per address', async () => {
		const ip = fakeAddress();
		const send = () =>
			api('/api/auth/send-verification-email', {
				method: 'POST',
				body: { email: 'nobody@example.com', callbackURL: '/signin' },
				ip
			});

		for (let attempt = 1; attempt <= 5; attempt++) expect((await send()).status).toBe(200);
		expect((await send()).status).toBe(429);
	});
});
