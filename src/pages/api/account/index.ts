import type { APIRoute } from 'astro';
import { and, count, eq } from 'drizzle-orm';
import { getDb } from '../../../lib/server/db';
import * as table from '../../../lib/server/db/schema';
import { requireSession } from '../_lib/guard';
import { handler, json } from '../_lib/http';

export const prerender = false;

/**
 * What the profile needs to know about the caller's credentials that the session does
 * not carry: whether a password exists (recovery cannot be enrolled without one, and a
 * converted demo has none) and how many passkeys there are.
 */
export const GET: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const db = getDb();

		const [credential] = await db
			.select({ password: table.account.password })
			.from(table.account)
			.where(and(eq(table.account.userId, user.id), eq(table.account.providerId, 'credential')));
		const [passkeys] = await db
			.select({ n: count() })
			.from(table.passkey)
			.where(eq(table.passkey.userId, user.id));

		return json({ hasPassword: Boolean(credential?.password), passkeys: passkeys?.n ?? 0 });
	});
