import type { APIRoute } from 'astro';
import { modelsFor } from '../../lib/server/nhtsa';
import { requireSession } from './_lib/guard';
import { fail, handler } from './_lib/http';
import { fromNhtsa } from './_lib/nhtsa';

export const prerender = false;

/**
 * `?make=Jeep&year=1991`: NHTSA's model names for the vehicle form's Model suggestions.
 * The year narrows the list when it is a plausible one and is ignored otherwise.
 */
export const GET: APIRoute = (context) =>
	handler(async () => {
		await requireSession(context);
		const make = context.url.searchParams.get('make')?.trim() ?? '';
		if (make.length < 2 || make.length > 60) return fail(422, 'Name a make');

		const year = Number(context.url.searchParams.get('year'));
		const plausible =
			Number.isInteger(year) && year >= 1900 && year <= new Date().getFullYear() + 2;

		const models = await fromNhtsa('model lookup', () => modelsFor(make, plausible ? year : null));
		return new Response(JSON.stringify({ models }), {
			headers: { 'content-type': 'application/json', 'cache-control': 'private, max-age=86400' }
		});
	});
