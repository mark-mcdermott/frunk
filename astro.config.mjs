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
			// Seals the TOTP secret at rest. Required on any https deploy — see
			// `assertProductionSecrets`.
			ENCRYPTION_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
			// Transactional email (Resend). Optional so a build without it still succeeds —
			// `sendEmail` fails loudly at call time instead, which is the only place it matters.
			RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
			// Where the contact form lands. Defaults to the address in the footer and on the
			// privacy page, which forwards via Namecheap (PORT-PLAN Decision 1).
			CONTACT_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true })
		}
	},
	adapter: vercel(),
	integrations: [react()],
	vite: {
		plugins: [tailwindcss()]
	}
});
