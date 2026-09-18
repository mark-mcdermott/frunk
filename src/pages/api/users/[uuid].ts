import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { isAdmin } from '../../../lib/roles';
import { getDb } from '../../../lib/server/db';
import * as table from '../../../lib/server/db/schema';
import { requireSession } from '../_lib/guard';
import { forbidden, handler, json, noContent, notFound, readJson } from '../_lib/http';
import { updateUserSchema } from '../_lib/schemas';
import { clearSessionCookie, invalidateSession } from '../_lib/session';

export const prerender = false;

/**
 * A user may read and edit their own profile; an admin may read and edit anyone's.
 * Only an admin may change `roles`, and only an admin may delete another account —
 * deleting your own is allowed and ends the session with it.
 */
const PUBLIC_USER_COLUMNS = {
	id: table.user.id,
	uuid: table.user.uuid,
	username: table.user.username,
	avatar: table.user.avatar,
	age: table.user.age,
	roles: table.user.roles
} as const;

export const GET: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const uuid = context.params.uuid;
		if (!uuid) return notFound('User not found');
		if (uuid !== user.uuid && !isAdmin(user.roles)) return forbidden();

		const [found] = await getDb()
			.select(PUBLIC_USER_COLUMNS)
			.from(table.user)
			.where(eq(table.user.uuid, uuid));

		if (!found) return notFound('User not found');
		return json({ user: found });
	});

export const PATCH: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const uuid = context.params.uuid;
		if (!uuid) return notFound('User not found');

		const admin = isAdmin(user.roles);
		if (uuid !== user.uuid && !admin) return forbidden();

		const body = await readJson(context.request, updateUserSchema);
		if (body.roles && !admin) return forbidden();

		const [updated] = await getDb()
			.update(table.user)
			.set(body)
			.where(eq(table.user.uuid, uuid))
			.returning(PUBLIC_USER_COLUMNS);

		if (!updated) return notFound('User not found');
		return json({ user: updated });
	});

export const DELETE: APIRoute = (context) =>
	handler(async () => {
		const session = await requireSession(context);
		const uuid = context.params.uuid;
		if (!uuid) return notFound('User not found');

		const self = uuid === session.user.uuid;
		if (!self && !isAdmin(session.user.roles)) return forbidden();

		const [deleted] = await getDb()
			.delete(table.user)
			.where(eq(table.user.uuid, uuid))
			.returning({ uuid: table.user.uuid });

		if (!deleted) return notFound('User not found');

		if (self) {
			await invalidateSession(session.sessionId);
			clearSessionCookie(context.cookies);
		}

		return noContent();
	});
