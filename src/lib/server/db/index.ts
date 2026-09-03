import { drizzle as drizzleNeon, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { neon } from '@neondatabase/serverless';
import pg from 'pg';
import * as schema from './schema';

/**
 * Drizzle client, lazily constructed.
 *
 * Lazy because Astro evaluates module top-level code at build time as well as at
 * request time, and `DATABASE_URL` is a runtime-only secret on Vercel: connecting
 * eagerly would fail every build. Cached because a serverless invocation may be
 * reused across requests.
 *
 * The driver is chosen from the host. Neon in production speaks its own HTTP
 * protocol, which cannot talk to an ordinary Postgres; pointing `DATABASE_URL` at
 * any other host falls back to node-postgres over TCP, so the app runs against a
 * throwaway local database with no Neon account — that is what makes the API
 * exercisable in a test.
 */
export type Db = NeonHttpDatabase<typeof schema>;

let cached: Db | null = null;

function isNeon(url: string): boolean {
	try {
		return new URL(url).hostname.endsWith('.neon.tech');
	} catch {
		return false;
	}
}

export function getDb(): Db {
	if (cached) return cached;

	const url = process.env.DATABASE_URL;
	if (!url) throw new Error('DATABASE_URL is not set');

	if (isNeon(url)) {
		cached = drizzleNeon(neon(url), { schema });
	} else {
		/*
		 * Deliberately narrowed to the Neon type rather than widened to a union.
		 * The two query builders are API-compatible across everything this app
		 * does, but a union defeats TypeScript's overload resolution on
		 * `.returning(columns)` at every call site. One cast here beats a cast in
		 * each handler, and Neon is the only driver production ever uses.
		 */
		const local = drizzlePg(new pg.Pool({ connectionString: url }), { schema });
		cached = local as unknown as Db;
	}

	return cached;
}
