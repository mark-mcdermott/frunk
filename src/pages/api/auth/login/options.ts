import type { APIRoute } from 'astro';
import {
	generateAuthenticationOptions,
	type AuthenticatorTransportFuture
} from '@simplewebauthn/server';
import { eq } from 'drizzle-orm';
import { checkRateLimit } from '../../../../lib/server/auth/rate-limit';
import { relyingParty, requiresUserVerification } from '../../../../lib/server/auth/relying-party';
import { getDb } from '../../../../lib/server/db';
import * as table from '../../../../lib/server/db/schema';
import { storeChallenge } from '../../_lib/challenge';
import { fail, handler, json, readJson, tooManyRequests } from '../../_lib/http';
import { authEmailSchema } from '../../_lib/schemas';

export const prerender = false;

const LIMIT = { limit: 10, windowMs: 15 * 60 * 1000 };

/**
 * Step 1 of sign-in: a challenge, plus the credentials this account is known to hold
 * so the browser can offer the right one.
 *
 * A missing account answers 404 rather than a vague failure. That is an
 * account-existence oracle, and it is a deliberate one: registration has to reject a
 * taken email, so the same fact is already discoverable there. Hiding it here would
 * buy nothing and cost the "no account — sign up instead" the UI can only show if it
 * is told. The rate limit above is what actually makes enumeration expensive.
 */
export const POST: APIRoute = (context) =>
	handler(async () => {
		const { email } = await readJson(context.request, authEmailSchema);
		const rp = relyingParty(context.url);

		const limit = await checkRateLimit(`login:${email}`, LIMIT);
		if (!limit.allowed) return tooManyRequests(limit.retryAfterMs);

		const db = getDb();
		const [account] = await db
			.select({ uuid: table.user.uuid })
			.from(table.user)
			.where(eq(table.user.username, email));

		if (!account) return fail(404, 'No account for that email address.');

		const registered = await db
			.select({ id: table.credentials.id, transports: table.credentials.transports })
			.from(table.credentials)
			.where(eq(table.credentials.userId, account.uuid));

		if (registered.length === 0) {
			return fail(409, 'That account has no passkey yet. Use your recovery code.');
		}

		const options = await generateAuthenticationOptions({
			rpID: rp.id,
			allowCredentials: registered.map((credential) => ({
				id: credential.id,
				transports: credential.transports
					? (JSON.parse(credential.transports) as AuthenticatorTransportFuture[])
					: undefined
			})),
			userVerification: requiresUserVerification(rp) ? 'required' : 'preferred'
		});

		await storeChallenge('login', email, options.challenge);
		return json(options);
	});
