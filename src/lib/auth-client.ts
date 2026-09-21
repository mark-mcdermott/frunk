import { createAuthClient } from 'better-auth/react';
import {
	anonymousClient,
	inferAdditionalFields,
	twoFactorClient
} from 'better-auth/client/plugins';
import { passkeyClient } from '@better-auth/passkey/client';
import type { Auth } from './server/auth/config';
import type { SessionUser } from './user';

/**
 * Better Auth's browser client (Decision 2).
 *
 * The exported function names are unchanged from the hand-rolled client so the auth
 * islands did not all have to be rewritten at once — same trick as `ResolvedSession`
 * on the server. What changed underneath is that the ceremonies are no longer ours:
 * `signIn.passkey()` runs the whole WebAuthn exchange, where this file used to fetch
 * options, call `navigator.credentials`, and post the result back itself.
 *
 * `inferAdditionalFields<Auth>` is what carries `roles`, `age` and `cookieConsent`
 * through to the client types. Without it the session user is Better Auth's shape and
 * `roles` — which every demo check reads — comes back as `unknown`.
 */
export const authClient = createAuthClient({
	plugins: [passkeyClient(), twoFactorClient(), anonymousClient(), inferAdditionalFields<Auth>()]
});

/** Better Auth's session store is a nanostore, so islands can subscribe to it directly. */
export const { useSession, signOut: endSession } = authClient;

export function toSessionUser(user: Record<string, unknown>): SessionUser {
	return {
		id: String(user.id),
		email: String(user.email ?? ''),
		name: String(user.name ?? ''),
		image: (user.image as string | null) ?? null,
		roles: Array.isArray(user.roles) ? (user.roles as number[]) : [],
		emailVerified: Boolean(user.emailVerified),
		twoFactorEnabled: Boolean(user.twoFactorEnabled)
	};
}

/**
 * Thrown so the forms can keep rendering one message from one place. Better Auth
 * returns `{ data, error }` rather than rejecting, so every call below has to check.
 */
export class AuthError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'AuthError';
	}
}

function unwrap<T>(result: { data: T | null; error?: { message?: string } | null }): T {
	if (result.error || !result.data) {
		throw new AuthError(result.error?.message ?? 'Something went wrong. Please try again.');
	}
	return result.data;
}

export async function signUp(email: string, password: string, name: string): Promise<SessionUser> {
	const data = unwrap(await authClient.signUp.email({ email, password, name }));
	return toSessionUser(data.user as Record<string, unknown>);
}

/** A password sign-in either opens a session or, with recovery enrolled, asks for the code. */
export type SignInResult = { user: SessionUser } | { twoFactorRedirect: true };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
	const data: unknown = unwrap(await authClient.signIn.email({ email, password }));
	/*
	 * Better Auth's two-factor plugin does not know that frunk's TOTP is meant as recovery
	 * rather than a second factor. Once a code is enrolled, every password sign-in answers
	 * `{ twoFactorRedirect: true }` and a challenge cookie instead of a session, and the
	 * session opens only when `verify-totp` accepts a code against that cookie (verified
	 * over HTTP, 2026-09-20). Treating that answer as a user was how a recovery-enrolled
	 * account became one that could not sign in with its password at all.
	 */
	if (isRecord(data) && data.twoFactorRedirect === true) return { twoFactorRedirect: true };
	if (isRecord(data) && isRecord(data.user)) return { user: toSessionUser(data.user) };
	throw new AuthError('Something went wrong. Please try again.');
}

/**
 * Adding a passkey needs an existing session — which is the mechanism behind Decision
 * 5's "upgrade in place": a demo visitor is already signed in anonymously, so attaching
 * a credential converts that same row and keeps everything they made.
 */
export async function registerPasskey(name?: string): Promise<void> {
	const result = await authClient.passkey.addPasskey({ name });
	if (result?.error) throw new AuthError(result.error.message ?? 'Could not add that passkey.');
}

export async function signInWithPasskey(): Promise<void> {
	const result = await authClient.signIn.passkey();
	if (result?.error)
		throw new AuthError(result.error.message ?? 'Could not sign in with a passkey.');
}

/**
 * TOTP is recovery, not a second factor — it stands in for a passkey that is gone. It
 * completes the password sign-in that answered `twoFactorRedirect`; on its own, with no
 * challenge cookie, Better Auth refuses it (401 `INVALID_TWO_FACTOR_COOKIE`). The device
 * is trusted for thirty days afterwards, so the code is not demanded on every sign-in
 * from a browser that has already proved itself.
 */
export async function recoverWithCode(code: string): Promise<void> {
	unwrap(await authClient.twoFactor.verifyTotp({ code, trustDevice: true }));
}

export async function startRecoverySetup(password: string): Promise<{ totpURI: string }> {
	/*
	 * `enable` is typed as a union because the plugin can be configured for OTP as
	 * well as TOTP. frunk only ever uses TOTP, so anything without a `totpURI` is a
	 * misconfiguration rather than a state the UI should try to render.
	 */
	const data = unwrap(await authClient.twoFactor.enable({ password }));
	if (!('totpURI' in data)) {
		throw new AuthError('Recovery setup is misconfigured — expected a TOTP secret.');
	}
	return { totpURI: data.totpURI };
}

/**
 * Was re-exported from `@simplewebauthn/browser`, which went with the hand-rolled
 * ceremonies. The check itself is one property, so it does not need a dependency —
 * it gates whether the sign-in screen offers a passkey button at all.
 */
export function browserSupportsWebAuthn(): boolean {
	return typeof window !== 'undefined' && typeof window.PublicKeyCredential === 'function';
}

export async function confirmRecoverySetup(code: string): Promise<void> {
	unwrap(await authClient.twoFactor.verifyTotp({ code }));
}

/**
 * Still frunk's own endpoint rather than `signIn.anonymous()` directly: it rate limits,
 * clones the template garage, and applies the DEMO role, none of which the plugin does.
 */
export async function startDemo(): Promise<SessionUser> {
	const response = await fetch('/api/demo', {
		method: 'POST',
		headers: { 'content-type': 'application/json' }
	});

	if (!response.ok) {
		const body = await response.json().catch(() => ({}));
		throw new AuthError(body.error ?? 'The demo is not available right now.');
	}

	const body = (await response.json()) as { user: Record<string, unknown> };
	return toSessionUser(body.user);
}

/**
 * Re-sends the verification link.
 *
 * This is not a convenience. Better Auth sends the sign-up email as a *background
 * task*, so a send that fails is logged and the request still answers 200 — the
 * account exists and nothing was delivered (see `server/email.ts`). Without this the
 * user has no way out of that state.
 */
export async function resendVerification(email: string): Promise<void> {
	const result = await authClient.sendVerificationEmail({ email, callbackURL: '/signin' });
	if (result?.error) {
		throw new AuthError(result.error.message ?? 'Could not send that email. Try again shortly.');
	}
}

export async function signOut(): Promise<void> {
	await endSession();
}

/**
 * Name and avatar go through Better Auth's own endpoint rather than
 * `PATCH /api/users/:id`, because this one refreshes the session store — the header
 * avatar updates the moment the save lands, with no reload and no manual cache poke.
 */
export async function updateProfile(body: { name?: string; image?: string | null }): Promise<void> {
	const result = await authClient.updateUser(body);
	if (result?.error) throw new AuthError(result.error.message ?? 'Could not save your profile.');
}

export function authErrorMessage(cause: unknown): string {
	if (cause instanceof AuthError) return cause.message;
	if (cause instanceof Error && cause.name === 'NotAllowedError') {
		return 'That was cancelled or timed out. Try again.';
	}
	return 'Something went wrong. Please try again.';
}
