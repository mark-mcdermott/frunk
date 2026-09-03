import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

let cached: NeonHttpDatabase<typeof schema> | null = null;

/**
 * Lazily-constructed Drizzle client over Neon's HTTP driver.
 *
 * Lazy because Astro evaluates module top-level code at build time as well as at
 * request time, and `DATABASE_URL` is a runtime-only secret on Vercel: connecting
 * eagerly would fail every build. Cached because a serverless invocation may be
 * reused across requests.
 */
export function getDb(): NeonHttpDatabase<typeof schema> {
	if (cached) return cached;

	const url = process.env.DATABASE_URL;
	if (!url) throw new Error('DATABASE_URL is not set');

	cached = drizzle(neon(url), { schema });
	return cached;
}
