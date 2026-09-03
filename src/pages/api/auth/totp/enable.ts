import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { openSecret } from '../../../../lib/server/auth/secrets';
import { verifyTotp } from '../../../../lib/server/auth/totp';
import { getDb } from '../../../../lib/server/db';
import * as table from '../../../../lib/server/db/schema';
import { requireSession } from '../../_lib/guard';
import { fail, handler, json, readJson } from '../../_lib/http';
import { totpEnableSchema } from '../../_lib/schemas';

export const prerender = false;

/**
 * Turn the pending secret on, but only once the user has produced a code from it.
 * Enabling on trust would hand out a recovery method that turns out not to work on the
 * one day it is needed.
 */
export const POST: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const { token } = await readJson(context.request, totpEnableSchema);

		const db = getDb();
		const [current] = await db
			.select({ totpSecret: table.user.totpSecret })
			.from(table.user)
			.where(eq(table.user.uuid, user.uuid));

		if (!current?.totpSecret) return fail(400, 'Start the recovery setup first.');
		if (!(await verifyTotp(token, openSecret(current.totpSecret)))) {
			return fail(400, 'That code is not right. Check your authenticator app and try again.');
		}

		await db
			.update(table.user)
			.set({ totpEnabled: true })
			.where(eq(table.user.uuid, user.uuid));

		return json({ totpEnabled: true });
	});
