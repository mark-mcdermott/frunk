import { NATIVE_ORIGINS_EXTRA } from 'astro:env/server';

/**
 * The origins a bundled native build calls the API from: Capacitor's webview on iOS
 * (`capacitor://localhost`) and on Android (`https://localhost`, or `http://` with the
 * older scheme). The applet inside the app is a different origin from the site, so
 * everything it does is cross-origin by construction — `src/middleware.ts` answers its
 * CORS preflights and Better Auth trusts it for sign-in. Nothing else is cross-origin
 * by design.
 *
 * No web page can claim one of these: a browser sets `Origin` itself, and a page on a
 * real site is never `capacitor://localhost`. A page a person runs on their own
 * `localhost` could, but it carries neither the app's bearer token nor the site's
 * cookies (they are `SameSite=Lax` and CORS here is credential-less), so it reaches
 * nothing an anonymous caller could not.
 *
 * `NATIVE_ORIGINS_EXTRA` adds comma-separated origins for a rehearsal — the journeys
 * serve the native bundle from a second local port to exercise all of this in a
 * browser.
 */
const NATIVE_ORIGINS = ['capacitor://localhost', 'https://localhost', 'http://localhost'];

export function nativeOrigins(): string[] {
	const extra = (NATIVE_ORIGINS_EXTRA ?? '')
		.split(',')
		.map((origin) => origin.trim())
		.filter(Boolean);
	return [...NATIVE_ORIGINS, ...extra];
}

export function isNativeOrigin(origin: string | null): origin is string {
	return origin !== null && nativeOrigins().includes(origin);
}
