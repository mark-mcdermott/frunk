import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb } from '../../../../lib/server/db';
import * as table from '../../../../lib/server/db/schema';
import { requireSession } from '../../_lib/guard';
import { handler, json } from '../../_lib/http';

export const prerender = false;

/** Forget the secret and turn recovery off. Signed in only. */
export const POST: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);

		await getDb()
			.update(table.user)
			.set({ totpSecret: null, totpEnabled: false })
			.where(eq(table.user.uuid, user.uuid));

		return json({ totpEnabled: false });
	});
