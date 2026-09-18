import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw redirect(302, '/');
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

	return { vendor };
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		if (!locals.user) {
			throw redirect(302, '/');
		}

		const [vendor] = await db
			.select()
			.from(table.vendors)
			.where(eq(table.vendors.id, params.id));

		if (!vendor || vendor.userId !== locals.user.uuid) {
			throw error(403, 'Forbidden');
		}

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const address = formData.get('address') as string;
		const phone = formData.get('phone') as string;
		const website = formData.get('website') as string;

		if (!name?.trim()) {
			return fail(400, { message: 'Name is required' });
		}

		await db
			.update(table.vendors)
			.set({
				name: name.trim(),
				address: address?.trim() || null,
				phone: phone?.trim() || null,
				website: website?.trim() || null,
				updatedAt: new Date()
			})
			.where(eq(table.vendors.id, params.id));

		throw redirect(302, `/demo/vendors/${params.id}`);
	},

	delete: async ({ params, locals }) => {
		if (!locals.user) {
			throw redirect(302, '/');
		}

		const [vendor] = await db
			.select()
			.from(table.vendors)
			.where(eq(table.vendors.id, params.id));

		if (!vendor || vendor.userId !== locals.user.uuid) {
			throw error(403, 'Forbidden');
		}

		await db.delete(table.vendors).where(eq(table.vendors.id, params.id));

		throw redirect(302, '/demo/vendors');
	}
};
