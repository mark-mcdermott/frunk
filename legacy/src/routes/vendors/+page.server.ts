import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/sign-in');
	}

	const vendors = await db
		.select()
		.from(table.vendors)
		.where(eq(table.vendors.userId, locals.user.uuid))
		.orderBy(desc(table.vendors.createdAt));

	return { vendors };
};

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(302, '/sign-in');
		}

		const formData = await request.formData();
		const vendorId = formData.get('vendorId') as string;

		if (!vendorId) {
			return { success: false, error: 'Vendor ID is required' };
		}

		// Verify the vendor belongs to the user
		const [vendor] = await db
			.select()
			.from(table.vendors)
			.where(eq(table.vendors.id, vendorId));

		if (!vendor || vendor.userId !== locals.user.uuid) {
			return { success: false, error: 'Vendor not found' };
		}

		await db.delete(table.vendors).where(eq(table.vendors.id, vendorId));

		return { success: true };
	}
};
