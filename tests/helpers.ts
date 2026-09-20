import { BASE } from './setup/server';

/**
 * Shared plumbing for the API tests.
 *
 * Every request goes through `api()` so the Origin header is never forgotten: Astro's
 * CSRF check rejects a POST that looks like a cross-site form submission, and the
 * resulting 403 is easy to mistake for an auth failure.
 */

export interface ApiOptions {
	method?: string;
	body?: unknown;
	/** A cookie jar string from `signUpAndSignIn`, or nothing for an anonymous call. */
	cookie?: string;
}

export async function api(path: string, { method = 'GET', body, cookie }: ApiOptions = {}) {
	const headers: Record<string, string> = { Origin: BASE };
	if (body !== undefined) headers['content-type'] = 'application/json';
	if (cookie) headers.cookie = cookie;

	return fetch(`${BASE}${path}`, {
		method,
		headers,
		body: body === undefined ? undefined : JSON.stringify(body)
	});
}

export async function json<T = Record<string, unknown>>(response: Response): Promise<T> {
	return (await response.json()) as T;
}

/** Collapses a `set-cookie` response into something `cookie:` will accept back. */
export function cookieJar(response: Response): string {
	return response.headers
		.getSetCookie()
		.map((entry) => entry.split(';')[0])
		.join('; ');
}

export interface TestUser {
	id: string;
	email: string;
	cookie: string;
}

let counter = 0;

/**
 * A signed-in user, ready to own things.
 *
 * `emailVerified` is forced straight in the database because `requireEmailVerification`
 * is on and no mail is delivered in a test run. Doing it through SQL rather than
 * relaxing the config keeps the tests honest about the behaviour production has.
 */
export async function signUpAndSignIn(): Promise<TestUser> {
	const email = `test-${Date.now()}-${counter++}@example.com`;
	const password = 'a-sufficiently-long-test-password';

	const created = await api('/api/auth/sign-up/email', {
		method: 'POST',
		body: { email, password, name: 'Test User' }
	});
	if (!created.ok) throw new Error(`sign-up failed: ${created.status}`);

	const { user } = await json<{ user: { id: string } }>(created);
	await verifyEmail(email);

	const signedIn = await api('/api/auth/sign-in/email', {
		method: 'POST',
		body: { email, password }
	});
	if (!signedIn.ok) throw new Error(`sign-in failed: ${signedIn.status}`);

	return { id: user.id, email, cookie: cookieJar(signedIn) };
}

/** A demo visitor: real account, real session, cloned garage, `DEMO` role. */
export async function startDemo(): Promise<{ cookie: string }> {
	const response = await api('/api/demo', { method: 'POST' });
	if (!response.ok) throw new Error(`demo failed: ${response.status}`);
	return { cookie: cookieJar(response) };
}

async function verifyEmail(email: string) {
	const { execFile } = await import('node:child_process');
	const { promisify } = await import('node:util');
	const run = promisify(execFile);
	const db = process.env.TEST_DB ?? 'frunk_test';

	await run('psql', [
		db,
		'-q',
		'-c',
		`update "user" set email_verified = true where email = '${email}'`
	]);
}
