import type { APIRoute } from 'astro';
import { loadHistory, renderReport, reportSlug } from '../../../../lib/server/report';
import { ownedVehicle, requireSession } from '../../_lib/guard';
import { handler, notFound } from '../../_lib/http';

export const prerender = false;

/** The vehicle's maintenance history as a PDF download — see `src/lib/server/report.ts`. */
export const GET: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const id = context.params.id;
		if (!id) return notFound('Vehicle not found');

		const vehicle = await ownedVehicle(id, user.id);
		const pdf = await renderReport(await loadHistory(vehicle));

		return new Response(new Uint8Array(pdf), {
			status: 200,
			headers: {
				'content-type': 'application/pdf',
				'content-length': String(pdf.byteLength),
				'content-disposition': `attachment; filename="${reportSlug(vehicle)}.pdf"`,
				'cache-control': 'private, no-store'
			}
		});
	});
