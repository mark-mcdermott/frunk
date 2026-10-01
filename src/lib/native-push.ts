import { Capacitor } from '@capacitor/core';
import { apiUrl, NATIVE } from './platform';
import { authHeaders } from './session-token';

/**
 * Push notifications on the device: asking for permission, getting the token Apple
 * hands the app, and telling the API where this phone can be reached.
 *
 * **Asking is the opt-in.** Nothing here runs until the switch on the profile is turned
 * on — an app that asks for notifications on first launch is asking before it has given
 * a reason. Once on, the token is refreshed quietly at each launch, because Apple may
 * rotate it; turning the switch off, or signing out, takes the phone off the list.
 *
 * iOS only for now. Android registers through Firebase, and without its config file in
 * the shell the plugin does not fail politely — it takes the app down — so the switch
 * is not offered there until a sender and that file exist.
 */
const TOKEN_KEY = 'frunk.push-token';
/** How long to wait for Apple to answer a registration before giving up on it. */
const REGISTRATION_TIMEOUT_MS = 15_000;

export const pushAvailable = () => NATIVE && Capacitor.getPlatform() === 'ios';

const preferences = async () => (await import('@capacitor/preferences')).Preferences;
const plugin = async () => (await import('@capacitor/push-notifications')).PushNotifications;

/** The token this phone last registered, which doubles as "the switch is on". */
async function stored(): Promise<string | null> {
	return (await (await preferences()).get({ key: TOKEN_KEY })).value;
}

/** Registers with the platform's push service; null if nothing answers in time. */
async function deviceToken(): Promise<string | null> {
	const push = await plugin();

	let settle: (token: string | null) => void = () => {};
	const outcome = new Promise<string | null>((resolve) => {
		settle = resolve;
	});
	const registered = await push.addListener('registration', (token) => settle(token.value));
	const failed = await push.addListener('registrationError', () => settle(null));
	const timer = setTimeout(() => settle(null), REGISTRATION_TIMEOUT_MS);

	await push.register();
	try {
		return await outcome;
	} finally {
		clearTimeout(timer);
		await Promise.all([registered.remove(), failed.remove()]);
	}
}

async function tell(method: 'POST' | 'DELETE', token: string): Promise<boolean> {
	const response = await fetch(apiUrl('/api/push/device-token'), {
		method,
		headers: { 'content-type': 'application/json', ...authHeaders() },
		body: JSON.stringify({ platform: Capacitor.getPlatform(), token })
	});
	return response.ok;
}

export async function pushEnabled(): Promise<boolean> {
	return pushAvailable() && Boolean(await stored());
}

/**
 * Turns notifications on for this phone. False means the system said no — permission
 * was declined, now or earlier, which only the Settings app can undo.
 */
export async function enablePush(): Promise<boolean> {
	if (!pushAvailable()) return false;

	const permission = await (await plugin()).requestPermissions();
	if (permission.receive !== 'granted') return false;

	const token = await deviceToken();
	if (!token || !(await tell('POST', token))) return false;

	await (await preferences()).set({ key: TOKEN_KEY, value: token });
	return true;
}

export async function disablePush(): Promise<void> {
	if (!pushAvailable()) return;

	const token = await stored();
	if (!token) return;

	// Best effort: a phone that cannot reach the API still stops asking to be notified,
	// and a token nobody claims is dropped the first time Apple says it is gone.
	await tell('DELETE', token).catch(() => false);
	await (await preferences()).remove({ key: TOKEN_KEY });
}

/** At launch: if this phone opted in, re-register and send the token again. Never prompts. */
export async function refreshPush(): Promise<void> {
	if (!pushAvailable() || !(await stored())) return;

	const permission = await (await plugin()).checkPermissions();
	if (permission.receive !== 'granted') return;

	const token = await deviceToken();
	if (token && (await tell('POST', token))) {
		await (await preferences()).set({ key: TOKEN_KEY, value: token });
	}
}

/** A tapped notification opens the car it was about. */
export async function openFromPush(open: (path: string) => void): Promise<void> {
	if (!pushAvailable()) return;

	await (
		await plugin()
	).addListener('pushNotificationActionPerformed', (action) => {
		const vehicleId: unknown = action.notification.data?.vehicleId;
		if (typeof vehicleId === 'string' && /^[\w-]+$/.test(vehicleId)) open(`/vehicles/${vehicleId}`);
	});
}
