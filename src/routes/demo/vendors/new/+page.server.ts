import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(302, '/');
		}

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const address = formData.get('address') as string;
		const phone = formData.get('phone') as string;
		const website = formData.get('website') as string;

		if (!name?.trim()) {
			return fail(400, { message: 'Name is required' });
		}

		const vendorId = crypto.randomUUID();

		await db.insert(table.vendors).values({
			id: vendorId,
			userId: locals.user.uuid,
			name: name.trim(),
			address: address?.trim() || null,
			phone: phone?.trim() || null,
			website: website?.trim() || null
		});

		throw redirect(302, `/demo/vendors/${vendorId}`);
	}
};
