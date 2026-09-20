import { defineConfig } from '@playwright/test';

/**
 * Browser journeys against the real applet (Decision 11, the layer above the API suite).
 *
 * `tests/run.sh --e2e` owns the server and the database and exports `TEST_BASE`, exactly
 * as it does for Vitest — this file only points at it. Chromium only: it is the engine
 * inside the Capacitor webview on Android, and one browser keeps the Actions bill in
 * proportion to what the suite protects.
 *
 * **One worker, files in name order.** The specs share a single demo account (the demo
 * endpoint is rate limited to three per hour and each one clones a whole garage), so
 * they run serially and the file prefixes (`01-`, `02-`…) are the order. The one that
 * deletes the account is last.
 */
export default defineConfig({
	testDir: 'tests/e2e',
	globalSetup: './tests/e2e/global-setup.ts',
	fullyParallel: false,
	workers: 1,
	retries: process.env.CI ? 1 : 0,
	timeout: 60_000,
	expect: { timeout: 10_000 },
	reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
	use: {
		baseURL: process.env.TEST_BASE ?? 'http://localhost:4455',
		storageState: 'tests/e2e/.state/demo.json',
		trace: 'on-first-retry',
		browserName: 'chromium'
	}
});
