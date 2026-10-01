import type { CapacitorConfig } from '@capacitor/cli';

/**
 * The native shells **bundle the applet** (`pnpm build:native` → `dist-native`), which
 * is what makes them apps rather than a website in a frame: they launch with no
 * network, and Apple's minimum-functionality rule (Guideline 4.2) is about exactly that
 * difference. The bundle calls the deployed API cross-origin with a bearer token — see
 * "Native clients" in `docs/API.md`.
 *
 * Passkeys still work, though the page is no longer on `frunk.cloud`:
 * `@capgo/capacitor-passkey` routes `navigator.credentials` to the system's passkey
 * APIs, which sign for the associated domain (`public/.well-known/…`), and `cap sync`
 * lets the plugin keep the entitlement and the Android asset statements in step.
 *
 * `CAP_SERVER_URL` still points a build at a dev server for live reload; unset, the
 * shell shows the bundle.
 */
const devServer = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
	appId: 'com.frunk.app',
	appName: 'Frunk',
	webDir: 'dist-native',
	// The page pads itself out of the notch and the home indicator with
	// env(safe-area-inset-*); letting the scroll view inset as well doubles the gap.
	ios: { contentInset: 'never' },
	plugins: {
		CapacitorPasskey: {
			origin: 'https://frunk.cloud',
			autoShim: true,
			domains: ['frunk.cloud']
		}
	},
	...(devServer ? { server: { url: devServer, cleartext: devServer.startsWith('http://') } } : {})
};

export default config;
