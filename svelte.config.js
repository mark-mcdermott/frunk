import adapterCloudflare from '@sveltejs/adapter-cloudflare';
import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Use static adapter for desktop/mobile builds, Cloudflare for web
const isStatic = process.env.ADAPTER === 'static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: isStatic
			? adapterStatic({
					pages: 'build',
					assets: 'build',
					fallback: 'index.html', // SPA fallback for client-side routing
					precompress: false,
					strict: true
				})
			: adapterCloudflare()
	}
};

export default config;
