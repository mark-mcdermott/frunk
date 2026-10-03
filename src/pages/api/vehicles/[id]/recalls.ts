import type { APIRoute } from 'astro';
import { recallsFor } from '../../../../lib/server/nhtsa';
import { ownedVehicle, requireSession } from '../../_lib/guard';
import { handler, json, notFound } from '../../_lib/http';
import { fromNhtsa } from '../../_lib/nhtsa';

export const prerender = false;

/**
 * NHTSA's safety recalls for the vehicle's make, model and year. A recall is issued per
 * model, not per car, so this says what *may* apply; whether a specific car was fixed is
 * the dealer's record, keyed by VIN, which NHTSA does not publish.
 */
export const GET: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const id = context.params.id;
		if (!id) return notFound('Vehicle not found');

		const vehicle = await ownedVehicle(id, user.id);
		const recalls = await fromNhtsa('recall lookup', () =>
			recallsFor(vehicle.make, vehicle.model, vehicle.year)
		);
		return json({ recalls });
	});
