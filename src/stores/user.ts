import { atom, computed } from 'nanostores';
import type { SessionUser } from '../lib/user';

/**
 * Who is signed in, shared across islands.
 *
 * A nanostore rather than React context because each island is its own React root
 * (docs/PORT-PLAN.md) — the header's user menu and the sign-in form on the page below
 * it cannot see each other's providers, but they can both read this. Signing in
 * updates the header without a reload.
 */

export type AuthStatus = 'loading' | 'ready';

export const $user = atom<SessionUser | null>(null);
export const $authStatus = atom<AuthStatus>('loading');

export const $signedIn = computed(
	[$user, $authStatus],
	(user, status) => status === 'ready' && user !== null
);

export function setUser(user: SessionUser | null): void {
	$user.set(user);
	$authStatus.set('ready');
}

let inFlight: Promise<void> | null = null;

/**
 * Reads `/api/auth/me` once per page load, however many islands ask. Signed out is a
 * 200 with a null user, so a failure here is a real failure — and it still resolves to
 * `ready` with no user rather than leaving the header spinning.
 */
export function loadUser(): Promise<void> {
	inFlight ??= fetch('/api/auth/me')
		.then((response) => (response.ok ? response.json() : { user: null }))
		.then((payload: { user: SessionUser | null }) => setUser(payload.user))
		.catch(() => setUser(null));

	return inFlight;
}
