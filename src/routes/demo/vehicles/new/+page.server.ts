import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(302, '/');
		}

		const formData = await request.formData();
		const make = formData.get('make') as string;
		const model = formData.get('model') as string;
		const yearStr = formData.get('year') as string;
		const vin = formData.get('vin') as string;

		if (!make?.trim()) {
			return fail(400, { message: 'Make is required', make, model, year: yearStr, vin });
		}

		if (!model?.trim()) {
			return fail(400, { message: 'Model is required', make, model, year: yearStr, vin });
		}

		const year = parseInt(yearStr, 10);
		if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 2) {
			return fail(400, { message: 'Please enter a valid year', make, model, year: yearStr, vin });
		}

		const vehicleId = crypto.randomUUID();

		await db.insert(table.vehicles).values({
			id: vehicleId,
			userId: locals.user.uuid,
			make: make.trim(),
			model: model.trim(),
			year,
			vin: vin?.trim() || null
		});

		throw redirect(302, `/demo/vehicles/${vehicleId}`);
	}
};
