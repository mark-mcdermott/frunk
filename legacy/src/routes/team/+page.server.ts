import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const allUsers = await db
		.select({
			id: user.id,
			username: user.username
		})
		.from(user)
		.orderBy(asc(user.username));

	return { users: allUsers };
};
