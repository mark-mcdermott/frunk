import type { APIRoute } from 'astro';
import { handler, noContent } from '../_lib/http';
import { clearSessionCookie, invalidateSession, resolveSession } from '../_lib/session';

export const prerender = false;

/** Idempotent: signing out when already signed out is a 204, not an error. */
export const POST: APIRoute = ({ cookies }) =>
	handler(async () => {
		const session = await resolveSession(cookies);
		if (session) await invalidateSession(session.sessionId);
		clearSessionCookie(cookies);
		return noContent();
	});
