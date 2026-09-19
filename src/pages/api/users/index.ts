import type { APIRoute } from 'astro';
import { asc, count, desc, ilike } from 'drizzle-orm';
import { getDb } from '../../../lib/server/db';
import * as table from '../../../lib/server/db/schema';
import { requireAdmin } from '../_lib/guard';
import { fail, handler, json } from '../_lib/http';
import { userListQuerySchema } from '../_lib/schemas';

export const prerender = false;

/** Admin user list — paged, sortable, searchable by username. */
export const GET: APIRoute = (context) =>
	handler(async () => {
		await requireAdmin(context);

		const parsed = userListQuerySchema.safeParse(
			Object.fromEntries(context.url.searchParams.entries())
		);
		if (!parsed.success) return fail(400, 'Invalid query parameters');

		const { page, pageSize, sortBy, sortOrder, search } = parsed.data;
		const db = getDb();
		// `search` is bound as a parameter by Drizzle, not interpolated.
		const where = search ? ilike(table.user.username, `%${search}%`) : undefined;

		const sortColumn = { id: table.user.id, username: table.user.username, roles: table.user.roles }[
			sortBy
		];
		const direction = sortOrder === 'desc' ? desc : asc;

		const [[total], users] = await Promise.all([
			db.select({ value: count() }).from(table.user).where(where),
			db
				.select({
					id: table.user.id,
					uuid: table.user.id,
					username: table.user.username,
					avatar: table.user.avatar,
					roles: table.user.roles
				})
				.from(table.user)
				.where(where)
				.orderBy(direction(sortColumn))
				.limit(pageSize)
				.offset((page - 1) * pageSize)
		]);

		return json({ users, page, pageSize, total: total?.value ?? 0, sortBy, sortOrder, search });
	});
