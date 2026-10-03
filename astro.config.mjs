// @ts-check
import { defineConfig, envField } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
	site: 'https://frunk.cloud',
	/*
	 * Declared through `astro:env` rather than read straight off `process.env`.
	 * A `.env` file is loaded by Astro into its own env layer, NOT into
	 * `process.env` — so `process.env.DATABASE_URL` is undefined in dev even with
	 * a correct `.env`, while `drizzle.config.ts` (which imports `dotenv/config`
	 * itself) sees it fine. That split is exactly the kind of thing that wastes an
	 * afternoon. `astro:env` reads both: `.env` in dev, the real environment on
	 * Vercel.
	 */
	env: {
		/*
		 * Every variable here is `access: 'secret'`, which in astro:env means "read at
		 * runtime". A `public` server variable is validated and *inlined at build time*
		 * instead, so an optional one that is unset during the build is frozen as
		 * undefined for the life of that deploy — silently, since it has a fallback.
		 * RP_ID and RP_ORIGIN are not secrets, but they must be read at runtime.
		 */
		schema: {
			DATABASE_URL: envField.string({ context: 'server', access: 'secret' }),
			// Unset in development and on preview deploys: `relying-party.ts` derives
			// both from the request there, which is the only thing that can cover
			// Vercel's per-deploy preview hostnames.
			RP_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
			RP_ORIGIN: envField.string({ context: 'server', access: 'secret', optional: true }),
			// Transactional email (Resend). Optional so a build without it still succeeds —
			// `sendEmail` fails loudly at call time instead, which is the only place it matters.
			RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
			// Where the contact form lands. Defaults to the address in the footer and on the
			// privacy page, which forwards via Namecheap (PORT-PLAN Decision 1).
			CONTACT_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
			// Signs Better Auth's sessions AND derives the key that encrypts TOTP secrets
			// and backup codes at rest. Treat it as permanent: rotating logs everyone out
			// *and* destroys every recovery method (verified 2026-09-19 — see CLAUDE.md).
			BETTER_AUTH_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
			// Presented by Vercel's cron as `Authorization: Bearer …` — production only,
			// since only production runs crons. Unset, `/api/cron/*` answers 503.
			CRON_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
			// Vercel Blob (store: frunk-uploads, private). Optional so a build without it
			// succeeds — the upload and file endpoints answer 503 at call time instead.
			BLOB_READ_WRITE_TOKEN: envField.string({
				context: 'server',
				access: 'secret',
				optional: true
			}),
			// Apple Push Notification service, for the reminders (`src/lib/server/push.ts`):
			// the .p8 key's contents, its key id, and the team id. All three or no push.
			// `APNS_HOST` overrides Apple's hosts — the suite points it at a stand-in.
			APNS_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
			APNS_KEY_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
			APNS_TEAM_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
			APNS_HOST: envField.string({ context: 'server', access: 'secret', optional: true }),
			// NHTSA's VIN decoder and recall lookups (`src/lib/server/nhtsa.ts`) are public and
			// keyless; this overrides both hosts, and the suite points it at a stand-in.
			NHTSA_BASE: envField.string({ context: 'server', access: 'secret', optional: true }),
			// Extra origins treated like the native app's, comma-separated. Unset in
			// production; the journeys set it to serve the native bundle from a second port.
			NATIVE_ORIGINS_EXTRA: envField.string({ context: 'server', access: 'secret', optional: true })
		}
	},
	/*
	 * Astro's cross-site form check is restated in `src/middleware.ts`, which is the
	 * same rule with one exemption: the bundled native app's origin.
	 */
	security: { checkOrigin: false },
	adapter: vercel(),
	integrations: [react()],
	vite: {
		plugins: [tailwindcss()],
		/*
		 * Vite's dev server answers CORS preflights itself, before the app's middleware,
		 * and only for localhost origins — so in dev a preflight from the native app's
		 * origin got a 204 with no headers. Off, dev behaves like the deployed function,
		 * where `src/middleware.ts` is the only thing that speaks CORS.
		 */
		server: { cors: false }
	}
});
