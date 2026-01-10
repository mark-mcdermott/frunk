import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	// Get user's vehicles
	const vehicles = await db
		.select()
		.from(table.vehicles)
		.where(eq(table.vehicles.userId, locals.user.uuid));

	if (vehicles.length === 0) {
		return { notes: [], vehicles: [] };
	}

	const vehicleIds = vehicles.map((v) => v.id);

	// Get all notes for user's vehicles
	const notes = await db
		.select()
		.from(table.notes)
		.where(inArray(table.notes.vehicleId, vehicleIds))
		.orderBy(desc(table.notes.createdAt));

	return { notes, vehicles };
};
