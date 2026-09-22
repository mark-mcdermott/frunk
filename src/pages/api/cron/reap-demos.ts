import type { APIRoute } from 'astro';
import { reapDemoAccounts } from '../../../lib/server/reaper';
import { refuseUnlessCron } from '../_lib/cron';
import { handler, json } from '../_lib/http';

export const prerender = false;

/** Daily (`vercel.json`); see `_lib/cron.ts` for how the caller is checked. */
export const GET: APIRoute = (context) =>
	handler(async () => {
		const refused = refuseUnlessCron(context);
		if (refused) return refused;

		const reaped = await reapDemoAccounts();
		if (reaped.length > 0) console.info(`Reaped ${reaped.length} demo account(s):`, reaped);

		return json({ reaped: reaped.length });
	});
