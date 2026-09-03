import type { APIRoute } from 'astro';
import { handler, json } from '../_lib/http';
import { resolveSession } from '../_lib/session';

export const prerender = false;

/**
 * Who is asking. The nav user island reads this into a nanostore, and the applet
 * uses it to decide what to render — so it answers 200 with `{ user: null }` for a
 * signed-out visitor rather than 401. Not being signed in is not an error here.
 */
export const GET: APIRoute = ({ cookies }) =>
	handler(async () => {
		const session = await resolveSession(cookies);
		return json({ user: session?.user ?? null });
	});
