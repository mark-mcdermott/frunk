import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

let _db: NeonHttpDatabase<typeof schema> | null = null;

export function getDb() {
	if (!_db) {
		if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
		const client = neon(env.DATABASE_URL);
		_db = drizzle(client, { schema });
	}
	return _db;
}

// For backwards compatibility - lazy getter
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
	get(_, prop) {
		return getDb()[prop as keyof NeonHttpDatabase<typeof schema>];
	}
});
