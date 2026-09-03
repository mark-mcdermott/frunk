import type { APIRoute } from 'astro';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { eq } from 'drizzle-orm';
import { isDemo } from '../../../../lib/roles';
import { checkRateLimit } from '../../../../lib/server/auth/rate-limit';
import {
	assertProductionSecrets,
	relyingParty,
	requiresUserVerification,
	RP_NAME
} from '../../../../lib/server/auth/relying-party';
import { getDb } from '../../../../lib/server/db';
import * as table from '../../../../lib/server/db/schema';
import { storeChallenge } from '../../_lib/challenge';
import { fail, handler, json, readJson, tooManyRequests } from '../../_lib/http';
import { authEmailSchema } from '../../_lib/schemas';
import { resolveSession } from '../../_lib/session';

export const prerender = false;

const LIMIT = { limit: 10, windowMs: 15 * 60 * 1000 };

/**
 * Step 1 of registration: decide which account the passkey is for, and hand the
 * browser a challenge.
 *
 * Three things can be meant by "register", and the difference is who is asking:
 *
 * - **Signing up.** No session, the email is free — a new account, created in step 2.
 * - **Upgrading a demo.** A `DEMO` session: the visitor has been using a real account
 *   all along (Decision 5), so attaching a passkey converts it in place and everything
 *   they made during the trial simply stays theirs. This is the whole try-before-buy
 *   story, and it costs nothing but this branch.
 * - **Adding a passkey.** A session whose email matches — a second device, or the new
 *   passkey someone needs after signing in through TOTP recovery.
 *
 * The account itself is not written yet. An abandoned ceremony — the browser prompt
 * dismissed, which is one keypress — would otherwise leave an empty user row holding
 * an email address nobody can ever sign up with again.
 */
export const POST: APIRoute = (context) =>
	handler(async () => {
		const { email } = await readJson(context.request, authEmailSchema);
		const rp = relyingParty(context.url);
		assertProductionSecrets(rp);

		const limit = await checkRateLimit(`register:${email}`, LIMIT);
		if (!limit.allowed) return tooManyRequests(limit.retryAfterMs);

		const db = getDb();
		const session = await resolveSession(context.cookies);
		const [owner] = await db
			.select({ uuid: table.user.uuid })
			.from(table.user)
			.where(eq(table.user.username, email));

		let userId: string;
		if (session && session.user.username === email) {
			userId = session.user.uuid;
		} else if (session && isDemo(session.user.roles) && !owner) {
			userId = session.user.uuid;
		} else if (owner) {
			return fail(409, 'That email already has an account. Sign in instead.');
		} else {
			userId = crypto.randomUUID();
		}

		/*
		 * Offering a key the account already holds produces a confusing browser error
		 * rather than a useful one, so exclude what is already registered.
		 */
		const registered = await db
			.select({ id: table.credentials.id })
			.from(table.credentials)
			.where(eq(table.credentials.userId, userId));

		const options = await generateRegistrationOptions({
			rpName: RP_NAME,
			rpID: rp.id,
			userName: email,
			userID: new TextEncoder().encode(userId),
			attestationType: 'none',
			excludeCredentials: registered.map((credential) => ({ id: credential.id })),
			authenticatorSelection: {
				residentKey: 'preferred',
				/*
				 * Matched to what step 2 will demand. Asking for less here than
				 * `verifyRegistrationResponse` requires produces a passkey that registers
				 * and then fails verification — a dead end with no obvious cause.
				 */
				userVerification: requiresUserVerification(rp) ? 'required' : 'preferred'
			}
		});

		await storeChallenge('register', email, options.challenge, userId);
		return json(options);
	});
