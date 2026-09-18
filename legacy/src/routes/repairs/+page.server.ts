import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, inArray, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/sign-in');
	}

	// Get user's vehicles
	const vehicles = await db
		.select()
		.from(table.vehicles)
		.where(eq(table.vehicles.userId, locals.user.uuid));

	if (vehicles.length === 0) {
		return { repairs: [], vehicles: [] };
	}

	const vehicleIds = vehicles.map((v) => v.id);

	// Get all repairs for user's vehicles with vendor info
	const repairs = await db
		.select({
			id: table.repairs.id,
			vehicleId: table.repairs.vehicleId,
			vendorId: table.repairs.vendorId,
			description: table.repairs.description,
			date: table.repairs.date,
			mileage: table.repairs.mileage,
			cost: table.repairs.cost,
			status: table.repairs.status,
			vendorName: table.vendors.name
		})
		.from(table.repairs)
		.leftJoin(table.vendors, eq(table.repairs.vendorId, table.vendors.id))
		.where(inArray(table.repairs.vehicleId, vehicleIds))
		.orderBy(desc(table.repairs.date));

	// Create a map of vehicle info for display
	const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));

	// Add vehicle info to repairs
	const repairsWithVehicle = repairs.map((repair) => ({
		...repair,
		vehicle: vehicleMap.get(repair.vehicleId)
	}));

	return { repairs: repairsWithVehicle, vehicles };
};
