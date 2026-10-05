import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import { anonymous, bearer, twoFactor } from 'better-auth/plugins';
import { passkey } from '@better-auth/passkey';
import { BETTER_AUTH_SECRET } from 'astro:env/server';
import { getDb } from '../db';
import * as schema from '../db/schema';
import { sendEmail } from '../email';
import { isDemo, ROLE_IDS } from '../../roles';
import { relyingParty, RP_NAME } from './relying-party';
import { nativeOrigins } from '../origins';

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

/**
 * Answered to an email sign-up made from a demo session (409). The sign-up form
 * shows it verbatim, so it has to say what to do instead.
 */
const DEMO_SIGN_UP_REFUSED =
	'You are in a demo account. Add a passkey from your profile to keep this garage, or sign out first to create a separate account.';

/** `roles` is declared to Better Auth as an additional field, so it arrives loosely typed. */
function rolesOf(user: Record<string, unknown>): number[] {
	return Array.isArray(user.roles) ? (user.roles as number[]) : [];
}

/**
 * `roles` is what the app gates on (Decision 5); the anonymous plugin's own flag is
 * checked as well so the two can never disagree about who the guard applies to.
 */
function isDemoAccount(user: Record<string, unknown>): boolean {
	return isDemo(rolesOf(user)) || Boolean(user.isAnonymous);
}

function build(rp: { id: string; origin: string }) {
	return betterAuth({
		appName: RP_NAME,
		baseURL: rp.origin,
		/** The bundled native app signs in from its own origin — see `origins.ts`. */
		trustedOrigins: nativeOrigins(),
		secret: BETTER_AUTH_SECRET,

		database: drizzleAdapter(getDb(), { provider: 'pg', schema }),

		/**
		 * The request limiter, on everywhere and backed by Postgres (`rate_limit`).
		 *
		 * Better Auth's default is on in production only, in memory — and on Vercel that
		 * is one counter per function instance, reset whenever a new one spins up, so a
		 * password-guesser was slowed rather than stopped. The database store is one row
		 * per address and path, shared by every instance. It is enabled in development
		 * and tests as well, so the code path that runs on every production auth request
		 * is the one the suites exercise; the suites give each account its own forwarded
		 * address so they never trip limits meant for a single client.
		 *
		 * The rules override the defaults for the endpoints that cost something: password
		 * guesses, and the two that send mail. Two-factor keeps the plugin's own rule plus
		 * its Postgres lockout; the passkey ceremonies keep the general 100 per 10 s.
		 */
		rateLimit: {
			enabled: true,
			storage: 'database',
			customRules: {
				'/sign-in/email': { window: 60, max: 10 },
				'/sign-up/email': { window: 600, max: 10 },
				'/send-verification-email': { window: 600, max: 5 }
			}
		},

		emailAndPassword: {
			enabled: true,
			requireEmailVerification: true,
			/**
			 * Until this landed there was no way back into a password-only account.
			 *
			 * Passkeys and TOTP are the recovery story for anyone who enrolled them, but
			 * both are opt-in and come *after* sign-up — so an account that only ever had
			 * a password had nothing behind it. That is most accounts.
			 *
			 * Unlike `sendVerificationEmail` below, this is not a background task: a failed
			 * send reaches the caller, so the form can say so rather than claiming the mail
			 * is on its way.
			 */
			sendResetPassword: async ({ user, url }) => {
				await sendEmail({
					to: user.email,
					subject: 'Reset your Frunk password',
					text: `Reset your Frunk password:\n\n${url}\n\nThe link expires shortly. If you did not ask to reset it, ignore this message — your password will not change.`,
					html: `<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#0b0f18">
						<p>Reset your Frunk password.</p>
						<p><a href="${url}" style="display:inline-block;background:#6438cc;color:#fff;text-decoration:none;padding:12px 24px;border-radius:9999px;font-weight:600">Choose a new password</a></p>
						<p style="font-size:13px;color:#8b93a1">The link expires shortly. If you did not ask to reset it, ignore this message — your password will not change.</p>
					</div>`
				});
			}
		},

		/**
		 * frunk's own columns on `user`. Declared here so Better Auth round-trips them
		 * instead of dropping them on write. `roles` stays authoritative for demo
		 * accounts (Decision 5) — the anonymous plugin's `isAnonymous` is bookkeeping.
		 */
		user: {
			additionalFields: {
				roles: { type: 'number[]', defaultValue: [], input: false },
				age: { type: 'number', required: false },
				cookieConsent: { type: 'string', required: false, input: false },
				/** Editable from the profile; the maintenance digest honours it. */
				remindersByEmail: { type: 'boolean', required: false, defaultValue: true }
			},
			/**
			 * The account-settings pass (Decision 5's loose end). A demo account carries a
			 * placeholder address, and keeping the account asks for a real one: because the
			 * placeholder is unverified, `updateEmailWithoutVerification` lets the change
			 * apply at once, with the verification mail going to the new address. A verified
			 * account changing its address keeps the old one until the new one is verified —
			 * Better Auth's default when no change-confirmation mail is configured, and the
			 * right one here: a typo cannot lock anyone out.
			 */
			changeEmail: {
				enabled: true,
				updateEmailWithoutVerification: true
			}
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

		hooks: {
			/*
			 * Decision 5, guarded: an email sign-up from a demo session is refused.
			 * Better Auth's sign-up always mints a *second* account — nothing about it
			 * promotes the one the request came from — so the garage could only be left
			 * behind. Worse, the anonymous plugin then treated the next sign-in from that
			 * browser as a *link* and deleted the demo account, garage included
			 * (reproduced 2026-09-20; `tests/demo-conversion.test.ts` holds the line).
			 * The passkey hook below is the conversion. This turns the other door into a
			 * sign pointing at it.
			 */
			before: createAuthMiddleware(async (ctx) => {
				if (ctx.path !== '/sign-up/email') return;

				const session = await getSessionFromCtx(ctx, { disableRefresh: true });
				if (!session || !isDemoAccount(session.user)) return;

				throw new APIError('CONFLICT', { message: DEMO_SIGN_UP_REFUSED });
			}),
			/*
			 * Decision 5, the other half: a demo account becomes a real one the moment a
			 * passkey is registered on it. The passkey plugin only adds the credential —
			 * it knows nothing about roles — so the promotion happens here, after the
			 * ceremony has verified, and only then. Two columns change: `roles` from DEMO
			 * to USER, so the demo reaper (Phase 6) never sees a convertible account as
			 * disposable; and `isAnonymous` to false, so the anonymous plugin's link hooks
			 * stop treating the account as one — the two flags must not disagree.
			 */
			after: createAuthMiddleware(async (ctx) => {
				if (ctx.path !== '/passkey/verify-registration') return;
				if (ctx.context.returned instanceof APIError) return;

				const user = ctx.context.session?.user;
				if (!user) return;
				if (!rolesOf(user).includes(ROLE_IDS.DEMO)) return;

				await ctx.context.internalAdapter.updateUser(user.id, {
					roles: [ROLE_IDS.USER],
					isAnonymous: false
				});
			})
		},
		plugins: [
			passkey({ rpID: rp.id, rpName: RP_NAME, origin: rp.origin }),
			/**
			 * TOTP is recovery, not a second factor — it stands in for a passkey the user
			 * no longer has. Better Auth encrypts the secret and backup codes at rest with
			 * a key derived from `BETTER_AUTH_SECRET`, which is why that secret can never
			 * be rotated — see the ⚠️ on the `two_factor` table in `db/schema.ts`.
			 */
			twoFactor({ issuer: RP_NAME }),
			/** The Capacitor client is cross-origin, so cookies do not reach it. */
			bearer(),
			/**
			 * Decision 5: a demo visitor is a real account, upgraded in place. The
			 * plugin's default is to *delete* the anonymous account the moment its browser
			 * signs into any other account — garage, uploads and all, with no ceremony
			 * asking. Retiring a demo is the reaper's job (Phase 6), on its own predicate
			 * and its own schedule, so that delete is switched off here.
			 */
			anonymous({ disableDeleteAnonymousUser: true })
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
