import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { checkRateLimit } from '../../../../lib/server/auth/rate-limit';
import { openSecret } from '../../../../lib/server/auth/secrets';
import { verifyTotp } from '../../../../lib/server/auth/totp';
import { getDb } from '../../../../lib/server/db';
import * as table from '../../../../lib/server/db/schema';
import { fail, handler, json, readJson, tooManyRequests } from '../../_lib/http';
import { totpRecoverSchema } from '../../_lib/schemas';
import { createSession, generateSessionToken, setSessionCookie } from '../../_lib/session';

export const prerender = false;

/**
 * The way back in when every passkey is gone. Unauthenticated by necessity — the whole
 * point is that the user cannot authenticate.
 *
 * This is the weakest door in the building: six digits, and what is behind it is a full
 * session. Hence the tight limit — five attempts per quarter hour makes guessing
 * hopeless — and a single message for every failure, so it cannot be used to learn
 * which addresses have accounts or which have recovery set up.
 */
const LIMIT = { limit: 5, windowMs: 15 * 60 * 1000 };

const REJECTED = 'That code is not right, or recovery is not set up for that account.';

export const POST: APIRoute = (context) =>
	handler(async () => {
		const { email, token } = await readJson(context.request, totpRecoverSchema);

		const limit = await checkRateLimit(`recover:${email}`, LIMIT);
		if (!limit.allowed) return tooManyRequests(limit.retryAfterMs);

		const [account] = await getDb()
			.select({
				uuid: table.user.uuid,
				totpSecret: table.user.totpSecret,
				totpEnabled: table.user.totpEnabled
			})
			.from(table.user)
			.where(eq(table.user.username, email));

		if (!account?.totpEnabled || !account.totpSecret) return fail(400, REJECTED);
		if (!(await verifyTotp(token, openSecret(account.totpSecret)))) return fail(400, REJECTED);

		const sessionToken = generateSessionToken();
		const opened = await createSession(sessionToken, account.uuid);
		setSessionCookie(context.cookies, sessionToken, opened.expiresAt);

		return json({ user: opened.user });
	});
