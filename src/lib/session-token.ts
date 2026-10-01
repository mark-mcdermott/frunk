import { Capacitor } from '@capacitor/core';
import { NATIVE } from './platform';

/**
 * What the native bundle holds in place of a browser's cookie jar.
 *
 * **The bearer token** is the session: the server hands it back in `set-auth-token`
 * whenever a session opens and the app sends it as `Authorization: Bearer`. **The
 * relay** is the handful of short-lived cookies Better Auth sets between the two
 * requests of a passkey ceremony or a recovery sign-in — a webview cannot keep cookies
 * for another origin, so the server sends them in `x-frunk-relay` and gets them back
 * the same way (`src/lib/server/relay.ts`).
 *
 * Both live in memory for the synchronous read every request makes, and are persisted
 * in the platform's preferences store on a device. The web build never stores either:
 * its session is the httpOnly cookie, and a token in web storage would only widen what
 * a script injection could take.
 */
const TOKEN_KEY = 'frunk.session-token';
const RELAY_KEY = 'frunk.relay';

let token: string | null = null;
const relay = new Map<string, string>();

interface Store {
	get(key: string): Promise<string | null>;
	set(key: string, value: string): Promise<void>;
	remove(key: string): Promise<void>;
}

/** Preferences on a device; localStorage when the bundle is rehearsed in a browser. */
async function store(): Promise<Store> {
	if (Capacitor.isNativePlatform()) {
		const { Preferences } = await import('@capacitor/preferences');
		return {
			get: async (key) => (await Preferences.get({ key })).value,
			set: (key, value) => Preferences.set({ key, value }),
			remove: (key) => Preferences.remove({ key })
		};
	}
	return {
		get: async (key) => {
			try {
				return localStorage.getItem(key);
			} catch {
				return null;
			}
		},
		set: async (key, value) => {
			try {
				localStorage.setItem(key, value);
			} catch {
				// Blocked storage: the session lasts for this page only.
			}
		},
		remove: async (key) => {
			try {
				localStorage.removeItem(key);
			} catch {
				// Nothing was stored.
			}
		}
	};
}

export const getToken = () => token;

/** The header every API call carries in the native bundle; nothing on the web. */
export function authHeaders(): Record<string, string> {
	return NATIVE && token ? { authorization: `Bearer ${token}` } : {};
}

/** Reads what was persisted into memory; the bundle calls this once before it renders. */
export async function loadSession(): Promise<void> {
	if (!NATIVE) return;
	const saved = await store();
	token = await saved.get(TOKEN_KEY);
	try {
		const pairs = JSON.parse((await saved.get(RELAY_KEY)) ?? '{}') as Record<string, string>;
		for (const [name, value] of Object.entries(pairs)) relay.set(name, value);
	} catch {
		// A relay that will not parse is a relay that is empty.
	}
}

export async function setToken(value: string): Promise<void> {
	if (!NATIVE) return;
	token = value;
	await (await store()).set(TOKEN_KEY, value);
}

/** Signs this device out. The relay stays: "trust this device" outlives a session. */
export async function clearToken(): Promise<void> {
	token = null;
	if (!NATIVE) return;
	await (await store()).remove(TOKEN_KEY);
}

export function relayHeader(): string | null {
	return relay.size ? [...relay].map(([name, value]) => `${name}=${value}`).join('; ') : null;
}

/** Takes in what a response relayed; an empty value is the server clearing that cookie. */
export function absorbRelay(header: string | null): void {
	if (!NATIVE || !header) return;
	for (const pair of header.split(';')) {
		const at = pair.indexOf('=');
		if (at === -1) continue;
		const name = pair.slice(0, at).trim();
		const value = pair.slice(at + 1).trim();
		if (value) relay.set(name, value);
		else relay.delete(name);
	}
	void store().then((saved) => saved.set(RELAY_KEY, JSON.stringify(Object.fromEntries(relay))));
}
