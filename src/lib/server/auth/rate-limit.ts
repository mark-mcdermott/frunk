import { lt, sql } from 'drizzle-orm';
import { getDb } from '../db';
import * as table from '../db/schema';

/**
 * Fixed-window rate limiting for the unauthenticated auth entry points.
 *
 * Passkey sign-in needs no throttling to be safe — an attacker cannot forge a
 * signature by guessing. TOTP recovery is the opposite: six digits, and a correct
 * guess yields a session. Without a limit that is roughly a million tries against a
 * live account, which a script does in minutes.
 *
 * The counter lives in Postgres rather than in memory because serverless instances do
 * not share one, and an in-memory limiter would reset itself every cold start.
 */

export interface RateLimit {
	limit: number;
	windowMs: number;
}

export interface RateLimitDecision {
	allowed: boolean;
	retryAfterMs: number;
}

/** Rows idle this long are past any live window and safe to drop. */
const PRUNE_AFTER_MS = 60 * 60 * 1000;
/**
 * Prune on a fraction of checks. Distinct keys would otherwise accumulate forever,
 * and the only cron on this deploy is the daily demo reaper — but a delete on every
 * attempt would double the cost of the hot path for a table that only ever holds a
 * few rows.
 */
const PRUNE_PROBABILITY = 0.05;

/**
 * Records one attempt against `key` and reports whether it may proceed.
 *
 * The count is updated in a single statement so that concurrent attempts cannot both
 * read the same value and write it back — the read-modify-write that would let a
 * parallel attacker slip past the limit entirely.
 */
export async function checkRateLimit(
	key: string,
	{ limit, windowMs }: RateLimit
): Promise<RateLimitDecision> {
	const now = Date.now();
	const windowStart = new Date(now);
	const cutoff = new Date(now - windowMs);
	const db = getDb();

	const [row] = await db
		.insert(table.authRateLimits)
		.values({ key, count: 1, windowStart })
		.onConflictDoUpdate({
			target: table.authRateLimits.key,
			set: {
				// Inside the live window, increment; once it has elapsed, start a new one.
				count: sql`case when ${table.authRateLimits.windowStart} > ${cutoff} then ${table.authRateLimits.count} + 1 else 1 end`,
				windowStart: sql`case when ${table.authRateLimits.windowStart} > ${cutoff} then ${table.authRateLimits.windowStart} else ${windowStart} end`
			}
		})
		.returning({
			count: table.authRateLimits.count,
			windowStart: table.authRateLimits.windowStart
		});

	if (Math.random() < PRUNE_PROBABILITY) {
		await db
			.delete(table.authRateLimits)
			.where(lt(table.authRateLimits.windowStart, new Date(now - PRUNE_AFTER_MS)));
	}

	if (!row || row.count <= limit) return { allowed: true, retryAfterMs: 0 };
	return { allowed: false, retryAfterMs: Math.max(0, row.windowStart.getTime() + windowMs - now) };
}
