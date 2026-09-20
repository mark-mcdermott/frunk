import type { CapacitorConfig } from '@capacitor/cli';

/**
 * The native shells load the deployed origin rather than bundling the applet
 * (PORT-PLAN, Phase 6). The applet's routes are server-rendered catch-alls, so there is
 * no static entry to bundle, and loading the origin keeps auth same-origin: cookies work
 * unchanged and the relying party is `frunk.cloud`, which a bundled `capacitor://localhost`
 * origin could never satisfy for WebAuthn. Apple Guideline 4.2 (minimum functionality) is
 * the known exposure — the App Store risk in the plan.
 *
 * `CAP_SERVER_URL` re-points a build at a dev server. `http://localhost:4321` reaches the
 * Mac from the iOS simulator and is a secure context, so passkeys work there too.
 *
 * `webDir` is a placeholder page: with `server.url` set the shell never shows it.
 */
const url = process.env.CAP_SERVER_URL ?? 'https://frunk.cloud';

const config: CapacitorConfig = {
	appId: 'com.frunk.app',
	appName: 'Frunk',
	webDir: 'capacitor/www',
	server: {
		url,
		cleartext: url.startsWith('http://')
	}
};

export default config;
