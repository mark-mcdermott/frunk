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
 * Reads Better Auth's session once per page load, however many islands ask.
 *
 * `/api/auth/get-session` replaced the hand-rolled `/api/auth/me` (Decision 2). It
 * answers 200 with `null` when signed out, so a failure here is a real failure — and
 * it still resolves to `ready` with no user rather than leaving the header spinning.
 *
 * Better Auth's client keeps its own nanostore, but this one is kept because it is
 * what the islands already subscribe to, and because it narrows the session to
 * `SessionUser` in one place rather than at every reader.
 */
export function loadUser(): Promise<void> {
	inFlight ??= fetch('/api/auth/get-session')
		.then((response) => (response.ok ? response.json() : null))
		.then((payload: { user: Record<string, unknown> } | null) => {
			const user = payload?.user;
			if (!user) return setUser(null);

			setUser({
				id: String(user.id),
				email: String(user.email ?? ''),
				name: String(user.name ?? ''),
				image: (user.image as string | null) ?? null,
				roles: Array.isArray(user.roles) ? (user.roles as number[]) : [],
				emailVerified: Boolean(user.emailVerified),
				twoFactorEnabled: Boolean(user.twoFactorEnabled),
				remindersByEmail: user.remindersByEmail !== false
			});
		})
		.catch(() => setUser(null));

	return inFlight;
}
