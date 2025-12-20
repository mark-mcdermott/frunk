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

	// Get repairs associated with this vendor
	const repairs = await db
		.select()
		.from(table.repairs)
		.where(eq(table.repairs.vendorId, params.id))
		.orderBy(desc(table.repairs.date));

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
	}
};
