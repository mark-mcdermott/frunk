import { error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, count, asc, desc, ilike } from 'drizzle-orm';
import { isAdmin } from '$lib/roles';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	if (!isAdmin(locals.user.roles)) {
		throw error(403, 'Forbidden');
	}

	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const pageSize = Math.max(1, Math.min(100, Number(url.searchParams.get('pageSize')) || 10));
	const offset = (page - 1) * pageSize;

	const sortBy = url.searchParams.get('sortBy') || 'id';
	const sortOrder = url.searchParams.get('sortOrder') || 'asc';
	const search = url.searchParams.get('search') || '';

	// Build where clause for search
	const whereClause = search ? ilike(table.user.username, `%${search}%`) : undefined;

	const [totalResult] = await db
		.select({ count: count() })
		.from(table.user)
		.where(whereClause);
	const total = totalResult.count;

	// Map sortBy to actual column
	const sortColumn = {
		id: table.user.id,
		username: table.user.username,
		roles: table.user.roles
	}[sortBy] || table.user.id;

	const orderFn = sortOrder === 'desc' ? desc : asc;

	const users = await db
		.select({
			id: table.user.id,
			uuid: table.user.uuid,
			username: table.user.username,
			avatar: table.user.avatar,
			roles: table.user.roles
		})
		.from(table.user)
		.where(whereClause)
		.orderBy(orderFn(sortColumn))
		.limit(pageSize)
		.offset(offset);

	return { users, page, pageSize, total, sortBy, sortOrder, search };
};

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		if (!locals.user) {
			throw error(401, 'Unauthorized');
		}

		if (!isAdmin(locals.user.roles)) {
			throw error(403, 'Forbidden');
		}

		const formData = await request.formData();
		const userId = formData.get('userId') as string;

		if (!userId) {
			throw error(400, 'User ID is required');
		}

		// Prevent admin from deleting themselves
		if (userId === locals.user.uuid) {
			throw error(400, 'Cannot delete yourself');
		}

		await db.delete(table.user).where(eq(table.user.uuid, userId));

		return { success: true };
	}
};
