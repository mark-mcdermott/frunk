import type { APIContext } from 'astro';
import { timingSafeEqual } from 'node:crypto';
import { CRON_SECRET } from 'astro:env/server';
import { fail } from './http';

/**
 * Vercel's cron calls `/api/cron/*` with `Authorization: Bearer <CRON_SECRET>`. Crons
 * only run against the production deployment, so that is the only place the secret
 * needs to exist — and without one every cron endpoint refuses everyone rather than
 * running open.
 *
 * Returns the refusal to send, or `null` when the caller is the cron.
 */
export function refuseUnlessCron(context: APIContext): Response | null {
	if (!CRON_SECRET) return fail(503, 'Cron is not configured');
	if (!presents(context.request.headers.get('authorization'), CRON_SECRET)) {
		return fail(401, 'Unauthorized');
	}
	return null;
}

function presents(header: string | null, secret: string): boolean {
	const expected = Buffer.from(`Bearer ${secret}`);
	const given = Buffer.from(header ?? '');
	return given.length === expected.length && timingSafeEqual(given, expected);
}
