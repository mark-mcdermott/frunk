import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

/*
 * `drizzle-kit generate` only reads the schema, so the URL is allowed to be absent
 * there; `push`, `migrate` and `studio` fail on their own with a clear message.
 */
export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: { url: process.env.DATABASE_URL ?? '' },
	verbose: true,
	strict: true
});
