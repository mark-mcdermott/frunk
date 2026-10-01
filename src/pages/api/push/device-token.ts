import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import { getDb } from '../../../lib/server/db';
import * as table from '../../../lib/server/db/schema';
import { requireSession } from '../_lib/guard';
import { handler, json, noContent, readJson } from '../_lib/http';
import { deviceTokenSchema } from '../_lib/schemas';

export const prerender = false;

/**
 * Registers the phone this request came from for reminders. A token names an
 * installation, not a person: if it is already on file under someone else — they
 * signed out, you signed in — it moves to you rather than notifying them about your
 * garage on a phone they no longer hold.
 */
export const POST: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const body = await readJson(context.request, deviceTokenSchema);
		const now = new Date();

		const [device] = await getDb()
			.insert(table.deviceTokens)
			.values({ id: crypto.randomUUID(), userId: user.id, ...body })
			.onConflictDoUpdate({
				target: table.deviceTokens.token,
				set: { userId: user.id, platform: body.platform, updatedAt: now }
			})
			.returning({ id: table.deviceTokens.id, platform: table.deviceTokens.platform });

		return json({ device }, 201);
	});

/** Stops notifying this phone — the switch turned off, or a sign-out. Only your own token. */
export const DELETE: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const body = await readJson(context.request, deviceTokenSchema.pick({ token: true }));

		await getDb()
			.delete(table.deviceTokens)
			.where(and(eq(table.deviceTokens.token, body.token), eq(table.deviceTokens.userId, user.id)));

		return noContent();
	});
