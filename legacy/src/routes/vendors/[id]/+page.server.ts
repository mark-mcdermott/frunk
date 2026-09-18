import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw redirect(302, '/sign-in');
	}

	const [vendor] = await db
		.select()
		.from(table.vendors)
		.where(eq(table.vendors.id, params.id));

	if (!vendor) {
		throw error(404, 'Vendor not found');
	}

	if (vendor.userId !== locals.user.uuid) {
		throw error(403, 'Forbidden');
	}

	// Get repairs associated with this vendor, with vehicle info
	const repairsRaw = await db
		.select({
			id: table.repairs.id,
			vehicleId: table.repairs.vehicleId,
			vendorId: table.repairs.vendorId,
			description: table.repairs.description,
			date: table.repairs.date,
			mileage: table.repairs.mileage,
			cost: table.repairs.cost,
			status: table.repairs.status,
			createdAt: table.repairs.createdAt,
			vehicleYear: table.vehicles.year,
			vehicleMake: table.vehicles.make,
			vehicleModel: table.vehicles.model
		})
		.from(table.repairs)
		.leftJoin(table.vehicles, eq(table.repairs.vehicleId, table.vehicles.id))
		.where(eq(table.repairs.vendorId, params.id))
		.orderBy(desc(table.repairs.date));

	const repairs = repairsRaw.map(r => ({
		...r,
		vehicleName: r.vehicleYear && r.vehicleMake && r.vehicleModel
			? `${r.vehicleYear} ${r.vehicleMake} ${r.vehicleModel}`
			: null
	}));

	return { vendor, repairs };
};

export const actions: Actions = {
	delete: async ({ params, locals }) => {
		if (!locals.user) {
			throw redirect(302, '/sign-in');
		}

		const [vendor] = await db
			.select()
			.from(table.vendors)
			.where(eq(table.vendors.id, params.id));

		if (!vendor || vendor.userId !== locals.user.uuid) {
			throw error(403, 'Forbidden');
		}

		await db.delete(table.vendors).where(eq(table.vendors.id, params.id));

		throw redirect(302, '/vendors');
	},

	deleteRepair: async ({ request, params, locals }) => {
		if (!locals.user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const repairId = formData.get('repairId') as string;

		// Get repair and verify ownership through vehicle
		const [repair] = await db
			.select()
			.from(table.repairs)
			.where(eq(table.repairs.id, repairId));

		if (!repair) {
			throw error(404, 'Repair not found');
		}

		const [vehicle] = await db
			.select()
			.from(table.vehicles)
			.where(eq(table.vehicles.id, repair.vehicleId));

		if (!vehicle || vehicle.userId !== locals.user.uuid) {
			throw error(403, 'Forbidden');
		}

		await db.delete(table.repairs).where(eq(table.repairs.id, repairId));

		throw redirect(302, `/vendors/${params.id}`);
	}
};
