import type { APIRoute } from 'astro';
import {
	verifyAuthenticationResponse,
	type AuthenticationResponseJSON,
	type AuthenticatorTransportFuture
} from '@simplewebauthn/server';
import { eq } from 'drizzle-orm';
import { relyingParty, requiresUserVerification } from '../../../../lib/server/auth/relying-party';
import { getDb } from '../../../../lib/server/db';
import * as table from '../../../../lib/server/db/schema';
import { consumeChallenge } from '../../_lib/challenge';
import { fail, handler, json, readJson } from '../../_lib/http';
import { passkeyVerifySchema } from '../../_lib/schemas';
import { createSession, generateSessionToken, setSessionCookie } from '../../_lib/session';

export const prerender = false;

/** One message for every way a sign-in can fail, so none of them is a probe. */
const REJECTED = 'That passkey could not be verified. Try again.';

/**
 * Step 2 of sign-in: check the assertion against the stored public key, advance the
 * signature counter, and open a session.
 */
export const POST: APIRoute = (context) =>
	handler(async () => {
		const { email, response } = await readJson(context.request, passkeyVerifySchema);
		const rp = relyingParty(context.url);

		const pending = await consumeChallenge('login', email);
		if (!pending) return fail(400, 'That sign-in expired or was already used. Try again.');

		const db = getDb();
		const [row] = await db
			.select({ credential: table.credentials, username: table.user.username })
			.from(table.credentials)
			.innerJoin(table.user, eq(table.credentials.userId, table.user.uuid))
			.where(eq(table.credentials.id, response.id));

		// The passkey must belong to the account the challenge was issued for.
		if (!row || row.username !== email) return fail(400, REJECTED);
		const { credential } = row;

		let verification;
		try {
			verification = await verifyAuthenticationResponse({
				response: response as unknown as AuthenticationResponseJSON,
				expectedChallenge: pending.challenge,
				expectedOrigin: rp.origin,
				expectedRPID: rp.id,
				requireUserVerification: requiresUserVerification(rp),
				credential: {
					id: credential.id,
					publicKey: new Uint8Array(Buffer.from(credential.publicKey, 'base64url')),
					counter: credential.counter,
					transports: credential.transports
						? (JSON.parse(credential.transports) as AuthenticatorTransportFuture[])
						: undefined
				}
			});
		} catch (cause) {
			console.error('Passkey sign-in rejected:', cause);
			return fail(400, REJECTED);
		}

		if (!verification.verified) return fail(400, REJECTED);

		/*
		 * Clone detection. An authenticator that never rolls this forward reports 0 and
		 * is simply not counting; one that goes backwards has been copied, and
		 * `verifyAuthenticationResponse` refuses it — which only works if the newest
		 * value is written back here.
		 */
		await db
			.update(table.credentials)
			.set({ counter: verification.authenticationInfo.newCounter })
			.where(eq(table.credentials.id, credential.id));

		const token = generateSessionToken();
		const opened = await createSession(token, credential.userId);
		setSessionCookie(context.cookies, token, opened.expiresAt);

		return json({ user: opened.user });
	});
