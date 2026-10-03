import type { APIRoute } from 'astro';
import { decodeVin, VIN_PATTERN } from '../../../lib/server/nhtsa';
import { requireSession } from '../_lib/guard';
import { fail, handler } from '../_lib/http';
import { fromNhtsa } from '../_lib/nhtsa';

export const prerender = false;

const INVALID = 'A VIN is 17 letters and numbers, without I, O or Q';

/**
 * What NHTSA knows about a VIN, in the vehicle form's own words (`src/lib/server/nhtsa.ts`).
 * Signed-in only, so the endpoint is not an open relay to a government API.
 */
export const GET: APIRoute = (context) =>
	handler(async () => {
		await requireSession(context);
		const vin = (context.params.vin ?? '').trim().toUpperCase();
		if (!VIN_PATTERN.test(vin)) return fail(422, INVALID, { vin: [INVALID] });

		const decoded = await fromNhtsa('VIN lookup', () => decodeVin(vin));
		if (!decoded) return fail(404, 'NHTSA has no record of that VIN');

		return new Response(JSON.stringify(decoded), {
			headers: { 'content-type': 'application/json', 'cache-control': 'private, max-age=86400' }
		});
	});
