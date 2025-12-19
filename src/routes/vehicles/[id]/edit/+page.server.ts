import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw redirect(302, '/sign-in');
	}

	const [vehicle] = await db
		.select()
		.from(table.vehicles)
		.where(eq(table.vehicles.id, params.id));

	if (!vehicle) {
		throw error(404, 'Vehicle not found');
	}

	if (vehicle.userId !== locals.user.uuid) {
		throw error(403, 'Forbidden');
	}

	return { vehicle };
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		if (!locals.user) {
			throw redirect(302, '/sign-in');
		}

		const [vehicle] = await db
			.select()
			.from(table.vehicles)
			.where(eq(table.vehicles.id, params.id));

		if (!vehicle || vehicle.userId !== locals.user.uuid) {
			throw error(403, 'Forbidden');
		}

		const formData = await request.formData();
		const make = formData.get('make') as string;
		const model = formData.get('model') as string;
		const yearStr = formData.get('year') as string;
		const vin = formData.get('vin') as string;

		if (!make?.trim()) {
			return fail(400, { message: 'Make is required' });
		}

		if (!model?.trim()) {
			return fail(400, { message: 'Model is required' });
		}

		const year = parseInt(yearStr, 10);
		if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 2) {
			return fail(400, { message: 'Please enter a valid year' });
		}

		await db
			.update(table.vehicles)
			.set({
				make: make.trim(),
				model: model.trim(),
				year,
				vin: vin?.trim() || null,
				updatedAt: new Date()
			})
			.where(eq(table.vehicles.id, params.id));

		throw redirect(302, `/vehicles/${params.id}`);
	},

	delete: async ({ params, locals }) => {
		if (!locals.user) {
			throw redirect(302, '/sign-in');
		}

		const [vehicle] = await db
			.select()
			.from(table.vehicles)
			.where(eq(table.vehicles.id, params.id));

		if (!vehicle || vehicle.userId !== locals.user.uuid) {
			throw error(403, 'Forbidden');
		}

		await db.delete(table.vehicles).where(eq(table.vehicles.id, params.id));

		throw redirect(302, '/vehicles');
	}
};
