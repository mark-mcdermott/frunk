import type { AstroCookies } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb } from '../../../lib/server/db';
import * as table from '../../../lib/server/db/schema';

/**
 * Session mechanics, ported from `legacy/src/lib/server/auth.ts`.
 *
 * Passkeys (Decision 2, Phase 3) change how a session is *established*, not how it
 * is represented: an opaque token in a cookie, its SHA-256 hash as the primary key
 * of the `session` row, sliding 30-day expiry. So this layer is built now and the
 * WebAuthn ceremonies in Phase 3 simply call `createSession`.
 *
 * The SvelteKit app resolved the session once in `hooks.server.ts` and hung the
 * result off `locals`. There is no equivalent here by design: Astro serves the same
 * static HTML to everyone and never touches the session, so **every API handler
 * resolves it itself** (docs/PORT-PLAN.md, "Target architecture").
 */

const DAY_IN_MS = 1000 * 60 * 60 * 24;
const SESSION_TTL_MS = DAY_IN_MS * 30;
/** Refresh once the session is inside its last 15 days. */
const RENEW_BEFORE_MS = DAY_IN_MS * 15;

export const SESSION_COOKIE = 'auth-session';

/** The user fields every handler is allowed to see. Never widen this to the whole row. */
export interface SessionUser {
	id: number;
	uuid: string;
	username: string;
	avatar: string | null;
	roles: number[];
}

export interface ResolvedSession {
	user: SessionUser;
	sessionId: string;
	expiresAt: Date;
}

async function sha256Hex(input: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
	return Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export function generateSessionToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(18));
	return btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

export async function createSession(token: string, userUuid: string): Promise<ResolvedSession> {
	const sessionId = await sha256Hex(token);
	const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

	await getDb().insert(table.session).values({ id: sessionId, userId: userUuid, expiresAt });

	const [user] = await getDb()
		.select({
			id: table.user.id,
			uuid: table.user.uuid,
			username: table.user.username,
			avatar: table.user.avatar,
			roles: table.user.roles
		})
		.from(table.user)
		.where(eq(table.user.uuid, userUuid));

	if (!user) throw new Error(`No user ${userUuid} to open a session for`);

	return { user, sessionId, expiresAt };
}

/**
 * Resolves the cookie into a user, renewing a session that is close to expiry and
 * clearing one that has passed it. Returns null for "not signed in" — callers turn
 * that into a 401 via `requireUser`.
 */
export async function resolveSession(cookies: AstroCookies): Promise<ResolvedSession | null> {
	const token = cookies.get(SESSION_COOKIE)?.value;
	if (!token) return null;

	const sessionId = await sha256Hex(token);
	const db = getDb();

	const [row] = await db
		.select({
			user: {
				id: table.user.id,
				uuid: table.user.uuid,
				username: table.user.username,
				avatar: table.user.avatar,
				roles: table.user.roles
			},
			session: table.session
		})
		.from(table.session)
		.innerJoin(table.user, eq(table.session.userId, table.user.uuid))
		.where(eq(table.session.id, sessionId));

	if (!row) return null;

	if (Date.now() >= row.session.expiresAt.getTime()) {
		await db.delete(table.session).where(eq(table.session.id, sessionId));
		clearSessionCookie(cookies);
		return null;
	}

	let expiresAt = row.session.expiresAt;
	if (Date.now() >= expiresAt.getTime() - RENEW_BEFORE_MS) {
		expiresAt = new Date(Date.now() + SESSION_TTL_MS);
		await db.update(table.session).set({ expiresAt }).where(eq(table.session.id, sessionId));
		setSessionCookie(cookies, token, expiresAt);
	}

	return { user: row.user, sessionId, expiresAt };
}

export async function invalidateSession(sessionId: string): Promise<void> {
	await getDb().delete(table.session).where(eq(table.session.id, sessionId));
}

export function setSessionCookie(cookies: AstroCookies, token: string, expiresAt: Date): void {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		expires: expiresAt,
		httpOnly: true,
		sameSite: 'lax',
		secure: import.meta.env.PROD
	});
}

export function clearSessionCookie(cookies: AstroCookies): void {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
