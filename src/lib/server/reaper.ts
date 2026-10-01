import { and, arrayContains, eq, lt, ne, notExists, or } from 'drizzle-orm';
import { ROLE_IDS } from '../roles';
import { getDb } from './db';
import { DEMO_TEMPLATE_EMAIL } from './demo';
import * as table from './db/schema';
import { deleteUserFiles } from './files';

/**
 * The demo-account reaper (PORT-PLAN, Phase 6).
 *
 * A demo is a real, disposable account (Decision 5), and disposable has to mean
 * something: each one is a whole cloned garage, plus whatever it uploaded. The
 * predicate is deliberately three clauses, each protecting a real person's account
 * from a scheduled delete — `roles` contains DEMO, no passkey is attached, and the
 * row is older than the window. Conversion flips the role and attaches a passkey, so
 * a converted account fails two of the three; the no-passkey clause is the belt to
 * that brace.
 *
 * **And never the template.** The account every demo is cloned from is a demo-role
 * account with no passkey, so those three clauses describe it exactly. It survived for
 * as long as production was re-seeded every few days; the first quiet week, the reaper
 * deleted it and every demo answered 503 until someone looked (found 2026-09-30). It
 * is excluded by name.
 *
 * An anonymous account with no role at all is the other thing swept up: what was left
 * when a demo's clone failed halfway, before the endpoint learned to undo that itself.
 */

/**
 * A returning visitor inside the week finds their trial intact; after it, the
 * storage is reclaimed.
 */
export const DEMO_TTL_DAYS = 7;

/** Deletes every stale, unconverted demo account and its blobs; returns the ids. */
export async function reapDemoAccounts(now = new Date()): Promise<string[]> {
	const cutoff = new Date(now.getTime() - DEMO_TTL_DAYS * 24 * 60 * 60 * 1000);
	const db = getDb();

	const hasPasskey = db
		.select({ id: table.passkey.id })
		.from(table.passkey)
		.where(eq(table.passkey.userId, table.user.id));

	const reaped = await db
		.delete(table.user)
		.where(
			and(
				or(arrayContains(table.user.roles, [ROLE_IDS.DEMO]), eq(table.user.isAnonymous, true)),
				ne(table.user.email, DEMO_TEMPLATE_EMAIL),
				lt(table.user.createdAt, cutoff),
				notExists(hasPasskey)
			)
		)
		.returning({ id: table.user.id });

	// The rows cascade; the blobs do not, and each cleanup is best-effort on its own.
	await Promise.all(reaped.map(({ id }) => deleteUserFiles(id)));

	return reaped.map(({ id }) => id);
}
