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
		schema: {
			DATABASE_URL: envField.string({ context: 'server', access: 'secret' })
		}
	},
	adapter: vercel(),
	integrations: [react()],
	vite: {
		plugins: [tailwindcss()]
	}
});
