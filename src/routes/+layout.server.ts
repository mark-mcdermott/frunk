import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, inArray } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals }) => {
	let hasNotes = false;
	let hasRepairs = false;

	if (locals.user) {
		// Get user's vehicles
		const vehicles = await db
			.select({ id: table.vehicles.id })
			.from(table.vehicles)
			.where(eq(table.vehicles.userId, locals.user.uuid));

		if (vehicles.length > 0) {
			const vehicleIds = vehicles.map((v) => v.id);

			// Check if any vehicles have notes
			const notes = await db
				.select({ id: table.notes.id })
				.from(table.notes)
				.where(inArray(table.notes.vehicleId, vehicleIds))
				.limit(1);

			hasNotes = notes.length > 0;

			// Check if any vehicles have repairs
			const repairs = await db
				.select({ id: table.repairs.id })
				.from(table.repairs)
				.where(inArray(table.repairs.vehicleId, vehicleIds))
				.limit(1);

			hasRepairs = repairs.length > 0;
		}
	}

	return {
		user: locals.user,
		hasNotes,
		hasRepairs
	};
};
