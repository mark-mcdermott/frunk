import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const [profileUser] = await db
		.select({
			id: table.user.id,
			uuid: table.user.uuid,
			username: table.user.username,
			avatar: table.user.avatar,
			admin: table.user.admin
		})
		.from(table.user)
		.where(eq(table.user.uuid, params.id));

	if (!profileUser) {
		throw error(404, 'User not found');
	}

	// Only allow viewing own profile or if admin
	if (locals.user.uuid !== params.id && !locals.user.admin) {
		throw error(403, 'Forbidden');
	}

	return { profileUser };
};
