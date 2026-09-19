import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { anonymous, bearer, twoFactor } from 'better-auth/plugins';
import { passkey } from '@better-auth/passkey';
import { BETTER_AUTH_SECRET } from 'astro:env/server';
import { getDb } from '../db';
import * as schema from '../db/schema';
import { sendEmail } from '../email';
import { relyingParty, RP_NAME } from './relying-party';

/**
 * Better Auth, built per request origin (Decision 2).
 *
 * **Why this is a function rather than a module-level constant.** Two reasons, and
 * both are load-bearing:
 *
 * 1. `DATABASE_URL` is a runtime-only secret. Astro evaluates module top-level code at
 *    build time too, so constructing eagerly would fail every build — the same reason
 *    `getDb()` is lazy.
 * 2. The passkey plugin takes a **static** `rpID` and `origin`, but nothing static can
 *    cover Vercel's per-deploy preview hostnames. `relyingParty()` derives them from the
 *    request when `RP_ID` / `RP_ORIGIN` are unset, which is what makes previews and
 *    `localhost` work without configuration. Building one instance per origin preserves
 *    that while still only constructing each once.
 *
 * A wrong relying party does not fail loudly — it mints passkeys that can never sign in
 * — so the derivation is deliberately kept rather than replaced with a constant.
 */
const instances = new Map<string, ReturnType<typeof build>>();

function build(rp: { id: string; origin: string }) {
	return betterAuth({
		appName: RP_NAME,
		baseURL: rp.origin,
		secret: BETTER_AUTH_SECRET,

		database: drizzleAdapter(getDb(), { provider: 'pg', schema }),

		/**
		 * frunk's own columns on `user`. Declared here so Better Auth round-trips them
		 * instead of dropping them on write. `roles` stays authoritative for demo
		 * accounts (Decision 5) — the anonymous plugin's `isAnonymous` is bookkeeping.
		 */
		user: {
			additionalFields: {
				roles: { type: 'number[]', defaultValue: [], input: false },
				age: { type: 'number', required: false },
				cookieConsent: { type: 'string', required: false, input: false }
			}
		},

		emailAndPassword: {
			enabled: true,
			requireEmailVerification: true
		},

		emailVerification: {
			sendOnSignUp: true,
			/**
			 * Goes through the same helper as the contact form so the provider stays a
			 * contained change (Phase 5). A failed send here is a failed registration,
			 * which is why `sendEmail` throws rather than returning a flag.
			 */
			sendVerificationEmail: async ({ user, url }) => {
				await sendEmail({
					to: user.email,
					subject: 'Verify your email address',
					text: `Confirm your address to finish setting up Frunk:\n\n${url}\n\nIf you did not create an account, ignore this message.`,
					html: `<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#0b0f18">
						<p>Confirm your address to finish setting up Frunk.</p>
						<p><a href="${url}" style="display:inline-block;background:#6438cc;color:#fff;text-decoration:none;padding:12px 24px;border-radius:9999px;font-weight:600">Verify email</a></p>
						<p style="font-size:13px;color:#8b93a1">If you did not create an account, ignore this message.</p>
					</div>`
				});
			}
		},

		plugins: [
			passkey({ rpID: rp.id, rpName: RP_NAME, origin: rp.origin }),
			/**
			 * TOTP is recovery, not a second factor — it stands in for a passkey the user
			 * no longer has. See the ⚠️ on the `two_factor` table in `db/schema.ts`:
			 * whether Better Auth encrypts `secret` at rest is unconfirmed, and
			 * `secrets.ts` stays until it is.
			 */
			twoFactor({ issuer: RP_NAME }),
			/** The Capacitor client is cross-origin, so cookies do not reach it. */
			bearer(),
			/** Decision 5: a demo visitor is a real account, upgraded in place. */
			anonymous()
		]
	});
}

export function getAuth(requestUrl: URL) {
	const rp = relyingParty(requestUrl);
	const existing = instances.get(rp.origin);
	if (existing) return existing;

	const created = build(rp);
	instances.set(rp.origin, created);
	return created;
}

export type Auth = ReturnType<typeof build>;
