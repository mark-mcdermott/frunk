import { mkdir, writeFile } from 'node:fs/promises';
import { request } from '@playwright/test';
import { BASE, DEMO_FILE, STATE_FILE, startDemo } from './support';

/**
 * Mints the one demo account most journeys share and saves its cookies as Playwright
 * storage state. `POST /api/demo` clones a full garage and is rate limited to three an
 * hour, so one account is shared rather than one per spec — the same trade the API
 * suite makes, and the reason the config runs files serially.
 */
export default async function globalSetup() {
	const context = await request.newContext({ baseURL: BASE });
	const { user } = await startDemo(context);

	await mkdir('tests/e2e/.state', { recursive: true });
	await context.storageState({ path: STATE_FILE });
	await writeFile(DEMO_FILE, JSON.stringify({ id: user.id, email: user.email }));
	await context.dispose();
}
