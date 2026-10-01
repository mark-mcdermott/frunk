import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * The native bundle: the applet as static files for Capacitor's `webDir`.
 *
 * A plain Vite build beside the Astro one, because the two answer different
 * questions. Astro renders the site and its API on a server; the apps need the applet
 * alone, with no server behind it, to load from the device. `--mode native` reads
 * `.env.native`, which stamps `PUBLIC_NATIVE=1` and the production `PUBLIC_API_BASE`;
 * set `PUBLIC_API_BASE` in the environment to aim a build at a local server instead.
 *
 * `public/` comes along whole, so the seeded `/samples/…` images resolve from the
 * bundle and a demo garage has its pictures with no network.
 */
export default defineConfig({
	root: 'native',
	envDir: '..',
	envPrefix: 'PUBLIC_',
	publicDir: resolve(__dirname, 'public'),
	plugins: [react(), tailwindcss()],
	resolve: { alias: { '@': resolve(__dirname, 'src') } },
	build: { outDir: resolve(__dirname, 'dist-native'), emptyOutDir: true },
	preview: { port: 4477, strictPort: true }
});
