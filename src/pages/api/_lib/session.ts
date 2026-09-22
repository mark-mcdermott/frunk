import type { APIContext } from 'astro';
import { getAuth } from '../../../lib/server/auth/config';
import type { SessionUser } from '../../../lib/user';

/**
 * Session resolution, delegated to Better Auth (Decision 2).
 *
 * This file used to own the mechanics — opaque token, SHA-256 of it as the session
 * primary key, sliding 30-day expiry, cookie set and cleared by hand. Better Auth owns
 * all of that now, including the cookie, so what remains is a **projection**: its
 * session shape narrowed to the fields the rest of the API is allowed to see.
 *
 * Keeping `ResolvedSession` unchanged is deliberate. `guard.ts` and every entity
 * endpoint below it consume this type, so holding the interface steady is what kept
 * the auth swap from reaching into all seven CRUD surfaces.
 *
 * The SvelteKit app resolved the session once in `hooks.server.ts` and hung it off
 * `locals`. There is still no equivalent by design: Astro serves the same static HTML
 * to everyone and never touches the session, so **every API handler resolves it
 * itself** (docs/PORT-PLAN.md, "Target architecture").
 */

export type { SessionUser };

export interface ResolvedSession {
	user: SessionUser;
	sessionId: string;
	expiresAt: Date;
}

/**
 * Bearer tokens work here without extra handling: the `bearer` plugin reads the
 * `Authorization` header, which matters because the Capacitor client is cross-origin
 * and never receives the cookie.
 */
export async function resolveSession(context: APIContext): Promise<ResolvedSession | null> {
	const auth = getAuth(new URL(context.request.url));
	const result = await auth.api.getSession({ headers: context.request.headers });
	if (!result) return null;

	const { user, session } = result;

	return {
		user: {
			id: user.id,
			email: user.email,
			name: user.name,
			image: user.image ?? null,
			/*
			 * Declared to Better Auth as an additional field, so it round-trips — but it
			 * is typed loosely on the way out. Narrowed here rather than trusted.
			 */
			roles: Array.isArray(user.roles) ? (user.roles as number[]) : [],
			emailVerified: Boolean(user.emailVerified),
			twoFactorEnabled: Boolean(user.twoFactorEnabled),
			remindersByEmail: user.remindersByEmail !== false
		},
		sessionId: session.id,
		expiresAt: new Date(session.expiresAt)
	};
}
