import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/sign-in');
	}

	const vehicles = await db
		.select()
		.from(table.vehicles)
		.where(eq(table.vehicles.userId, locals.user.uuid))
		.orderBy(desc(table.vehicles.createdAt));

	return { vehicles };
};

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(302, '/sign-in');
		}

		const formData = await request.formData();
		const vehicleId = formData.get('vehicleId') as string;

		if (!vehicleId) {
			return { success: false, error: 'Vehicle ID is required' };
		}

		// Verify the vehicle belongs to the user
		const [vehicle] = await db
			.select()
			.from(table.vehicles)
			.where(eq(table.vehicles.id, vehicleId));

		if (!vehicle || vehicle.userId !== locals.user.uuid) {
			return { success: false, error: 'Vehicle not found' };
		}

		await db.delete(table.vehicles).where(eq(table.vehicles.id, vehicleId));

		return { success: true };
	}
};
