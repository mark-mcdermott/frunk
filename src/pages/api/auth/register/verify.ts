import type { APIRoute } from 'astro';
import {
	verifyRegistrationResponse,
	type RegistrationResponseJSON
} from '@simplewebauthn/server';
import { eq } from 'drizzle-orm';
import { isDemo, ROLE_IDS } from '../../../../lib/roles';
import {
	assertProductionSecrets,
	relyingParty,
	requiresUserVerification
} from '../../../../lib/server/auth/relying-party';
import { getDb } from '../../../../lib/server/db';
import * as table from '../../../../lib/server/db/schema';
import { consumeChallenge } from '../../_lib/challenge';
import { fail, handler, json, readJson } from '../../_lib/http';
import { passkeyVerifySchema } from '../../_lib/schemas';
import {
	createSession,
	generateSessionToken,
	invalidateSession,
	resolveSession,
	setSessionCookie
} from '../../_lib/session';

export const prerender = false;

/**
 * Step 2 of registration: check the authenticator's signature over the challenge from
 * step 1, store the public key, and open a session.
 *
 * The account is written here rather than in step 1, so the row and the passkey that
 * unlocks it are created together — see `register/options.ts`.
 */
export const POST: APIRoute = (context) =>
	handler(async () => {
		const { email, response } = await readJson(context.request, passkeyVerifySchema);
		const rp = relyingParty(context.url);
		assertProductionSecrets(rp);

		const pending = await consumeChallenge('register', email);
		if (!pending?.userId) {
			return fail(400, 'That sign-up expired or was already used. Start again.');
		}

		let verification;
		try {
			verification = await verifyRegistrationResponse({
				response: response as unknown as RegistrationResponseJSON,
				expectedChallenge: pending.challenge,
				expectedOrigin: rp.origin,
				expectedRPID: rp.id,
				requireUserVerification: requiresUserVerification(rp)
			});
		} catch (cause) {
			// The reason is for us, not for whoever is asking.
			console.error('Passkey registration rejected:', cause);
			return fail(400, 'That passkey could not be verified. Try again.');
		}

		if (!verification.verified || !verification.registrationInfo) {
			return fail(400, 'That passkey could not be verified. Try again.');
		}

		const db = getDb();
		const userId = pending.userId;
		const [existing] = await db
			.select({ uuid: table.user.uuid, roles: table.user.roles })
			.from(table.user)
			.where(eq(table.user.uuid, userId));

		if (!existing) {
			await db.insert(table.user).values({
				uuid: userId,
				username: email,
				roles: [ROLE_IDS.USER],
				// Holding the passkey *is* the proof of address control the emailed
				// verification link used to provide, so there is nothing left to verify.
				emailVerified: 1
			});
		} else if (isDemo(existing.roles)) {
			// Upgrade in place: same row, same data, now a real account.
			await db
				.update(table.user)
				.set({ username: email, roles: [ROLE_IDS.USER], emailVerified: 1 })
				.where(eq(table.user.uuid, userId));
		}
		// Otherwise this is an extra passkey on an existing account — the row is theirs
		// already, and rewriting `roles` here would quietly demote an admin.

		const { credential } = verification.registrationInfo;
		try {
			await db
				.insert(table.credentials)
				.values({
					id: credential.id,
					userId,
					publicKey: Buffer.from(credential.publicKey).toString('base64url'),
					counter: credential.counter,
					transports: JSON.stringify(credential.transports ?? [])
				})
				.onConflictDoNothing();
		} catch (cause) {
			/*
			 * A brand-new account with no passkey can never be signed into, and it holds
			 * the email address hostage. Undo it so the address is free to try again.
			 */
			if (!existing) await db.delete(table.user).where(eq(table.user.uuid, userId));
			throw cause;
		}

		// A converted demo visitor gets a session tied to their new standing, not the
		// one they were browsing under.
		const previous = await resolveSession(context.cookies);
		if (previous) await invalidateSession(previous.sessionId);

		const token = generateSessionToken();
		const opened = await createSession(token, userId);
		setSessionCookie(context.cookies, token, opened.expiresAt);

		return json({ user: opened.user }, existing ? 200 : 201);
	});
