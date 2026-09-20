import type { APIRoute } from 'astro';
import { timingSafeEqual } from 'node:crypto';
import { CRON_SECRET } from 'astro:env/server';
import { reapDemoAccounts } from '../../../lib/server/reaper';
import { fail, handler, json } from '../_lib/http';

export const prerender = false;

/**
 * Vercel's cron calls this daily (`vercel.json`) with `Authorization: Bearer
 * <CRON_SECRET>`. Crons only run against the production deployment, so that is the
 * only place the secret needs to exist — and without one the endpoint refuses
 * everyone rather than running open.
 */
export const GET: APIRoute = (context) =>
	handler(async () => {
		if (!CRON_SECRET) return fail(503, 'Cron is not configured');
		if (!presents(context.request.headers.get('authorization'), CRON_SECRET)) {
			return fail(401, 'Unauthorized');
		}

		const reaped = await reapDemoAccounts();
		if (reaped.length > 0) console.info(`Reaped ${reaped.length} demo account(s):`, reaped);

		return json({ reaped: reaped.length });
	});

function presents(header: string | null, secret: string): boolean {
	const expected = Buffer.from(`Bearer ${secret}`);
	const given = Buffer.from(header ?? '');
	return given.length === expected.length && timingSafeEqual(given, expected);
}
