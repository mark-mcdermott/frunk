import type { APIRoute } from 'astro';
import { RESEND_API_KEY } from 'astro:env/server';
import { collectDigests, sendMaintenanceDigests } from '../../../lib/server/reminders';
import { refuseUnlessCron } from '../_lib/cron';
import { fail, handler, json } from '../_lib/http';

export const prerender = false;

/**
 * Daily (`vercel.json`). Mails everyone who has maintenance overdue or due soon and
 * has not been told yet this cycle — see `src/lib/server/reminders.ts`.
 *
 * `?dryRun=1` answers with what *would* go out, sends nothing and stamps nothing:
 * the way to see tomorrow's mail, and the way the suite asserts who is selected
 * without a mail provider.
 */
export const GET: APIRoute = (context) =>
	handler(async () => {
		const refused = refuseUnlessCron(context);
		if (refused) return refused;

		if (new URL(context.request.url).searchParams.get('dryRun')) {
			const digests = await collectDigests();
			return json({
				dryRun: true,
				digests: digests.map((digest) => ({
					userId: digest.userId,
					email: digest.email,
					items: digest.items.map((item) => ({
						scheduleId: item.scheduleId,
						name: item.name,
						vehicleId: item.vehicleId,
						state: item.assessment.state
					}))
				}))
			});
		}

		if (!RESEND_API_KEY) return fail(503, 'Email is not configured');

		const run = await sendMaintenanceDigests();
		if (run.sent || run.failed) console.info('Maintenance digest:', run);

		return json(run);
	});
