import { defineConfig } from 'vitest/config';

/**
 * API integration tests (Decision 11).
 *
 * `tests/run.sh` owns the server and the database; this file only runs tests against
 * whatever `TEST_BASE` points at. Tests run single-threaded because they share one
 * server and one database, and parallel files would race on the rate-limit counters.
 */
export default defineConfig({
	test: {
		include: ['tests/**/*.test.ts'],
		maxWorkers: 1,
		fileParallelism: false,
		testTimeout: 30_000,
		hookTimeout: 90_000
	}
});
