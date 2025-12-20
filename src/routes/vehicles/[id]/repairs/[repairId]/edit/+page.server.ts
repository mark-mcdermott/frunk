import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw redirect(302, '/sign-in');
	}

	const [repair] = await db
		.select()
		.from(table.repairs)
		.where(eq(table.repairs.id, params.repairId));

	if (!repair) {
		throw error(404, 'Repair not found');
	}

	// Get vehicle and verify ownership
	const [vehicle] = await db
		.select()
		.from(table.vehicles)
		.where(eq(table.vehicles.id, repair.vehicleId));

	if (!vehicle || vehicle.userId !== locals.user.uuid) {
		throw error(403, 'Forbidden');
	}

	// Get user's vendors for the dropdown
	const vendors = await db
		.select()
		.from(table.vendors)
		.where(eq(table.vendors.userId, locals.user.uuid))
		.orderBy(table.vendors.name);

	return { repair, vehicle, vendors };
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		if (!locals.user) {
			throw redirect(302, '/sign-in');
		}

		const [repair] = await db
			.select()
			.from(table.repairs)
			.where(eq(table.repairs.id, params.repairId));

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

		const formData = await request.formData();
		const description = formData.get('description') as string;
		const dateStr = formData.get('date') as string;
		const mileageStr = formData.get('mileage') as string;
		const costStr = formData.get('cost') as string;
		const vendorId = formData.get('vendorId') as string;
		const status = formData.get('status') as string || 'completed';

		if (!description?.trim()) {
			return fail(400, { message: 'Description is required' });
		}

		if (!dateStr) {
			return fail(400, { message: 'Date is required' });
		}

		const mileage = mileageStr ? parseInt(mileageStr, 10) : null;
		const cost = costStr ? Math.round(parseFloat(costStr) * 100) : null;

		await db
			.update(table.repairs)
			.set({
				description: description.trim(),
				date: new Date(dateStr),
				mileage,
				cost,
				vendorId: vendorId || null,
				status,
				updatedAt: new Date()
			})
			.where(eq(table.repairs.id, params.repairId));

		throw redirect(302, `/vehicles/${params.id}/repairs/${params.repairId}`);
	},

	delete: async ({ params, locals }) => {
		if (!locals.user) {
			throw redirect(302, '/sign-in');
		}

		const [repair] = await db
			.select()
			.from(table.repairs)
			.where(eq(table.repairs.id, params.repairId));

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

		// Delete repair (notes will cascade delete due to FK)
		await db.delete(table.repairs).where(eq(table.repairs.id, params.repairId));

		throw redirect(302, `/vehicles/${params.id}`);
	}
};
