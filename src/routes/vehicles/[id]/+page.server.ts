import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
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

	// Only allow viewing own vehicles
	if (vehicle.userId !== locals.user.uuid) {
		throw error(403, 'Forbidden');
	}

	return { vehicle };
};
