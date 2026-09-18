import {
	browserSupportsWebAuthn,
	startAuthentication,
	startRegistration,
	type PublicKeyCredentialCreationOptionsJSON,
	type PublicKeyCredentialRequestOptionsJSON
} from '@simplewebauthn/browser';
import type { SessionUser } from './user';

/**
 * The browser half of the auth ceremonies (Decision 2).
 *
 * Each one is two requests around a call into the platform authenticator: ask the
 * server for a challenge, let the browser sign it with Touch ID / Windows Hello / a
 * security key, send the signature back. The middle step is the part that never
 * touches JavaScript we control — which is the point, and why there is no password
 * here to phish, reuse or leak.
 */

export class AuthError extends Error {
	constructor(
		message: string,
		readonly status: number
	) {
		super(message);
		this.name = 'AuthError';
	}
}

export { browserSupportsWebAuthn };

function errorMessage(payload: unknown): string | null {
	if (payload && typeof payload === 'object' && 'error' in payload) {
		const { error } = payload as { error: unknown };
		if (typeof error === 'string') return error;
	}
	return null;
}

/**
 * Same-origin, so the browser attaches the session cookie and an `Origin` header —
 * which Astro's CSRF check requires on every non-GET (docs/API.md).
 */
async function post<T>(path: string, body?: unknown): Promise<T> {
	const response = await fetch(path, {
		method: 'POST',
		headers: body === undefined ? undefined : { 'content-type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body)
	});

	if (response.status === 204) return undefined as T;

	const payload: unknown = await response.json().catch(() => null);
	if (!response.ok) {
		throw new AuthError(errorMessage(payload) ?? 'Something went wrong.', response.status);
	}
	return payload as T;
}

/**
 * Register a passkey. Creates the account when signed out; adds a passkey to the
 * current account when signed in, which is both how a demo visitor converts and how
 * someone who came in through recovery gets back to a passkey.
 */
export async function registerPasskey(email: string): Promise<SessionUser> {
	const optionsJSON = await post<PublicKeyCredentialCreationOptionsJSON>(
		'/api/auth/register/options',
		{ email }
	);
	const response = await startRegistration({ optionsJSON });
	const { user } = await post<{ user: SessionUser }>('/api/auth/register/verify', {
		email,
		response
	});
	return user;
}

export async function signInWithPasskey(email: string): Promise<SessionUser> {
	const optionsJSON = await post<PublicKeyCredentialRequestOptionsJSON>(
		'/api/auth/login/options',
		{ email }
	);
	const response = await startAuthentication({ optionsJSON });
	const { user } = await post<{ user: SessionUser }>('/api/auth/login/verify', { email, response });
	return user;
}

/** The way back in with no passkey to hand. Opens a session; it does not create one. */
export async function recoverWithCode(email: string, token: string): Promise<SessionUser> {
	const { user } = await post<{ user: SessionUser }>('/api/auth/totp/recover', { email, token });
	return user;
}

export async function startRecoverySetup(): Promise<{ uri: string; secret: string }> {
	return post<{ uri: string; secret: string }>('/api/auth/totp/setup');
}

export async function confirmRecoverySetup(token: string): Promise<void> {
	await post('/api/auth/totp/enable', { token });
}

export async function startDemo(): Promise<SessionUser> {
	const { user } = await post<{ user: SessionUser }>('/api/demo');
	return user;
}

export async function signOut(): Promise<void> {
	await post('/api/auth/signout');
}

/**
 * WebAuthn reports its failures as `DOMException`s whose names describe the spec
 * violation, not the situation — "NotAllowedError" is what a dismissed Touch ID prompt
 * produces, and showing that to someone is useless.
 */
export function authErrorMessage(cause: unknown): string {
	if (cause instanceof AuthError) return cause.message;

	if (cause instanceof Error) {
		switch (cause.name) {
			case 'NotAllowedError':
				return 'No passkey was used. The prompt was dismissed or it timed out.';
			case 'InvalidStateError':
				return 'This device already has a passkey for that account. Sign in instead.';
			case 'NotSupportedError':
				return 'This browser cannot create a passkey.';
			case 'SecurityError':
				return 'Passkeys need a secure connection to this site.';
			case 'AbortError':
				return 'That took too long. Try again.';
		}
	}

	return 'Something went wrong. Try again.';
}
