/**
 * Regenerates `drizzle/bootstrap.sql` from the drizzle migrations.
 *
 * That file exists so a blank database can be brought up with a single paste into
 * the Neon SQL Editor — no Node, no CLI, no laptop. Drizzle's own migrations are
 * not re-runnable, so every statement is wrapped: `CREATE TABLE IF NOT EXISTS`,
 * `ADD COLUMN IF NOT EXISTS`, and constraints in a `DO $$ ... EXCEPTION WHEN
 * duplicate_object` block.
 *
 * Run after `pnpm db:generate`.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'drizzle';
const OUT = join(DIR, 'bootstrap.sql');

const migrations = readdirSync(DIR)
	.filter((f) => /^\d{4}_.*\.sql$/.test(f))
	.sort();

if (migrations.length === 0) {
	console.error('No migrations found — run `pnpm db:generate` first.');
	process.exit(1);
}

const guard = (sql) =>
	sql
		.replace(/^CREATE TABLE "/gm, 'CREATE TABLE IF NOT EXISTS "')
		.replace(/^ALTER TABLE (.*) ADD COLUMN "/gm, 'ALTER TABLE $1 ADD COLUMN IF NOT EXISTS "')
		.replace(
			/^ALTER TABLE (.*) ADD CONSTRAINT (.*?);(?:--> statement-breakpoint)?$/gm,
			// `$$` is the escape for a literal `$` in a replacement string, so a
			// dollar-quoted block needs four of them to survive.
			'DO $$$$ BEGIN ALTER TABLE $1 ADD CONSTRAINT $2; EXCEPTION WHEN duplicate_object THEN NULL; END $$$$;'
		);

const header = `-- Frunk — one-shot database bootstrap.
--
-- Paste this whole file into the Neon SQL Editor (console.neon.tech → your project →
-- SQL Editor) and run it. It is everything a blank database needs to serve the API:
-- the schema, plus the three role rows that \`ROLE_IDS\` in src/lib/roles.ts hardcodes.
--
-- Safe to re-run: every statement is guarded, so a second run is a no-op.
--
-- GENERATED FILE — do not edit. Regenerate with:
--   pnpm db:generate && pnpm db:bootstrap-sql
-- Source: ${migrations.join(', ')}
`;

const roles = `
--
-- Roles. The ids are load-bearing: ROLE_IDS in src/lib/roles.ts is { DEMO: 1, USER: 2,
-- ADMIN: 3 }, so nothing role-gated works until these three rows exist.
--
INSERT INTO "roles" ("id", "name", "mutually_exclusive_with") VALUES
\t(1, 'Demo',  ARRAY[2, 3]),
\t(2, 'User',  ARRAY[1]),
\t(3, 'Admin', ARRAY[1])
ON CONFLICT ("id") DO NOTHING;

-- Keep the serial in step with the explicit ids above.
SELECT setval(pg_get_serial_sequence('roles', 'id'), (SELECT MAX("id") FROM "roles"));
`;

const body = migrations.map((f) => guard(readFileSync(join(DIR, f), 'utf8'))).join('\n');

writeFileSync(OUT, `${header}\n${body}\n${roles}`);
console.log(`Wrote ${OUT} from ${migrations.length} migration(s).`);
