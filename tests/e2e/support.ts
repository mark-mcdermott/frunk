import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { BlobNotFoundError, head } from '@vercel/blob';
import type { APIRequestContext, Page } from '@playwright/test';

/**
 * Shared plumbing for the browser journeys.
 *
 * The rules are the API suite's: the server and database belong to `tests/run.sh`,
 * every direct API call carries `Origin` (Astro's CSRF check rejects a bare POST with a
 * 403 that looks like an auth failure), and database state is checked with `psql`
 * rather than trusted from the screen.
 */

const run = promisify(execFile);

export const BASE = process.env.TEST_BASE ?? 'http://localhost:4455';
export const DB = process.env.TEST_DB ?? 'frunk_test';
export const STATE_FILE = 'tests/e2e/.state/demo.json';
export const DEMO_FILE = 'tests/e2e/.state/demo-user.json';

/** Runs one statement and returns the unaligned, tuples-only output, trimmed. */
export async function sql(statement: string): Promise<string> {
	const { stdout } = await run('psql', [DB, '-q', '-t', '-A', '-c', statement]);
	return stdout.trim();
}

/** The shared demo account minted by global setup. */
export async function demoUser(): Promise<{ id: string; email: string }> {
	return JSON.parse(await readFile(DEMO_FILE, 'utf8')) as { id: string; email: string };
}

/** `POST /api/demo` through a request context, so its cookies land in that context. */
export async function startDemo(request: APIRequestContext) {
	const response = await request.post('/api/demo', { headers: { Origin: BASE } });
	if (!response.ok()) throw new Error(`demo failed: ${response.status()}`);
	return (await response.json()) as { user: { id: string; email: string } };
}

/**
 * Uploads need the real store's token, which CI deliberately does not have. The
 * harness exports it from `.env.local` when that file exists, so locally the upload
 * journeys run and in CI they skip — visibly, as skipped, not as passed.
 */
export const uploadsAvailable = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

/**
 * Whether the file behind a stored serving URL still exists in the store. The database
 * says a photo is gone the moment its row is; only the store can say the bytes went too.
 */
export async function blobExists(url: string): Promise<boolean> {
	try {
		await head(url.slice('/api/files/'.length));
		return true;
	} catch (cause) {
		if (cause instanceof BlobNotFoundError) return false;
		throw cause;
	}
}

/**
 * A CDP virtual authenticator: a synthetic passkey that Chromium treats as a platform
 * authenticator. Resident key on, user verification on and auto-approved, so both
 * registration and discoverable sign-in complete without a prompt. This is the only
 * way the passkey ceremonies can be exercised at all — nothing lighter than a real
 * browser reaches them.
 */
export async function attachVirtualAuthenticator(page: Page) {
	const cdp = await page.context().newCDPSession(page);
	await cdp.send('WebAuthn.enable');
	await cdp.send('WebAuthn.addVirtualAuthenticator', {
		options: {
			protocol: 'ctap2',
			transport: 'internal',
			hasResidentKey: true,
			hasUserVerification: true,
			isUserVerified: true,
			automaticPresenceSimulation: true
		}
	});
	return cdp;
}
