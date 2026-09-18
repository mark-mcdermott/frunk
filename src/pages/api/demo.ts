import type { APIContext, APIRoute } from 'astro';
import { isDemo } from '../../lib/roles';
import { checkRateLimit } from '../../lib/server/auth/rate-limit';
import { cloneDemoAccount, DemoTemplateMissing } from '../../lib/server/demo';
import { fail, handler, json, tooManyRequests } from './_lib/http';
import {
	createSession,
	generateSessionToken,
	resolveSession,
	setSessionCookie
} from './_lib/session';

export const prerender = false;

/**
 * Start a demo. No passkey, no email, no form — a logged-out visitor gets a real
 * account with a `DEMO` role and a session, and can create, edit and delete for real
 * (Decision 5).
 *
 * Limited per address because each call writes a user plus their whole cloned garage.
 */
const LIMIT = { limit: 3, windowMs: 60 * 60 * 1000 };

export const POST: APIRoute = (context) =>
	handler(async () => {
		const existing = await resolveSession(context.cookies);
		if (existing) {
			// Already in a demo: hand back the same account rather than abandoning the
			// data they have been making, which is the thing conversion depends on.
			if (isDemo(existing.user.roles)) return json({ user: existing.user });
			return fail(409, 'You are already signed in to your own account.');
		}

		const limit = await checkRateLimit(`demo:${clientKey(context)}`, LIMIT);
		if (!limit.allowed) return tooManyRequests(limit.retryAfterMs);

		let userId: string;
		try {
			userId = await cloneDemoAccount();
		} catch (cause) {
			if (cause instanceof DemoTemplateMissing) {
				console.error(cause);
				return fail(503, 'The demo is not available right now.');
			}
			throw cause;
		}

		const token = generateSessionToken();
		const opened = await createSession(token, userId);
		setSessionCookie(context.cookies, token, opened.expiresAt);

		return json({ user: opened.user }, 201);
	});

/**
 * `clientAddress` is a getter that throws on an adapter which cannot supply one, so it
 * has to be read inside the guard rather than passed in. Everyone shares one bucket in
 * that case, which is degraded but still a limit.
 */
function clientKey(context: APIContext): string {
	try {
		return context.clientAddress;
	} catch {
		return 'unknown';
	}
}
