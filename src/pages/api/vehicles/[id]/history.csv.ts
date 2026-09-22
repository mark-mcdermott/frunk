import type { APIRoute } from 'astro';
import { loadHistory, renderCsv, reportSlug } from '../../../../lib/server/report';
import { ownedVehicle, requireSession } from '../../_lib/guard';
import { handler, notFound } from '../../_lib/http';

export const prerender = false;

/** The service record as CSV — the same rows the PDF tabulates, for a spreadsheet. */
export const GET: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const id = context.params.id;
		if (!id) return notFound('Vehicle not found');

		const vehicle = await ownedVehicle(id, user.id);
		const csv = renderCsv(await loadHistory(vehicle));

		return new Response(csv, {
			status: 200,
			headers: {
				'content-type': 'text/csv; charset=utf-8',
				'content-disposition': `attachment; filename="${reportSlug(vehicle)}.csv"`,
				'cache-control': 'private, no-store'
			}
		});
	});
