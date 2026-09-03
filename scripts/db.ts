import 'dotenv/config';
import { drizzle as drizzleNeon, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { neon } from '@neondatabase/serverless';
import pg from 'pg';
import * as schema from '../src/lib/server/db/schema';

/**
 * The Drizzle client for the seed scripts.
 *
 * It cannot be `src/lib/server/db/index.ts`: that reads `DATABASE_URL` from
 * `astro:env/server`, a virtual module that only exists inside an Astro build. These
 * scripts run under `tsx`, so they load `.env` themselves through dotenv.
 *
 * Driver selection matches the app's — Neon's HTTP protocol for `.neon.tech`, ordinary
 * node-postgres for anything else — so a seed lands in a throwaway local database
 * exactly as it lands in Neon.
 */
export type ScriptDb = NeonHttpDatabase<typeof schema>;

export function scriptDb(): ScriptDb {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error('DATABASE_URL is not set');

	let host = '';
	try {
		host = new URL(url).hostname;
	} catch {
		throw new Error('DATABASE_URL is not a valid connection string');
	}

	if (host.endsWith('.neon.tech')) return drizzleNeon(neon(url), { schema });

	// Narrowed rather than widened for the same reason as the app's client: a union of
	// the two query builders defeats overload resolution at every call site.
	return drizzlePg(new pg.Pool({ connectionString: url }), { schema }) as unknown as ScriptDb;
}

/** Prints the database a script is about to touch, so a mistake is visible before it lands. */
export function describeTarget(): string {
	const url = new URL(process.env.DATABASE_URL ?? '');
	return `${url.hostname}${url.pathname}`;
}
