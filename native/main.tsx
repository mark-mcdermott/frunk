import '@fontsource-variable/playfair-display';
import '@fontsource-variable/playfair-display/wght-italic.css';
import '@fontsource-variable/plus-jakarta-sans';
import './native.css';
import { Capacitor } from '@capacitor/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { openFromPush, refreshPush } from '@/lib/native-push';
import { getToken, loadSession } from '@/lib/session-token';
import { NativeRoot, screenFor } from './NativeRoot';

/**
 * The native bundle's entry (`pnpm build:native`): the applet as static files for the
 * Capacitor shells. Two things have to exist before the first render — the passkey
 * shim, so `navigator.credentials` reaches the system's passkey sheet instead of a
 * webview that would refuse it, and the stored session, so the first paint is already
 * the right screen and not a sign-in form that flickers into the garage.
 */
async function boot() {
	if (Capacitor.isNativePlatform()) {
		try {
			const { CapacitorPasskey } = await import('@capgo/capacitor-passkey');
			await CapacitorPasskey.autoShimWebAuthn();
		} catch (cause) {
			// Passkeys are one way in, not the only one: the password still signs in.
			console.error('Passkey shim failed to install:', cause);
		}
	}

	await loadSession();

	const root = document.getElementById('root');
	if (!root) throw new Error('The native bundle has no #root to mount into.');

	createRoot(root).render(
		<StrictMode>
			<NativeRoot screen={screenFor(window.location, Boolean(getToken()))} />
		</StrictMode>
	);

	// After the first paint, and only for a phone that opted in on the profile.
	void openFromPush((path) => window.location.assign(path));
	if (getToken()) void refreshPush();
}

void boot();
