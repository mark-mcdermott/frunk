import type { APIContext, APIRoute } from 'astro';
import { isDemo } from '../../lib/roles';
import { getAuth } from '../../lib/server/auth/config';
import { checkRateLimit } from '../../lib/server/auth/rate-limit';
import { cloneDemoAccount, DemoTemplateMissing } from '../../lib/server/demo';
import { fail, handler, json, tooManyRequests } from './_lib/http';
import { resolveSession } from './_lib/session';

export const prerender = false;

/**
 * Start a demo. No passkey, no email, no form — a logged-out visitor gets a real
 * account and a session, and can create, edit and delete for real (Decision 5).
 *
 * Better Auth's `anonymous` plugin creates the account and opens the session; this
 * endpoint only rate limits it and clones the sample garage in afterwards. That split
 * is what makes conversion free: attaching a credential later upgrades the *same* row,
 * so nothing made during the trial is lost.
 *
 * Limited per address because each call writes a user plus their whole cloned garage.
 */
const LIMIT = { limit: 3, windowMs: 60 * 60 * 1000 };

export const POST: APIRoute = (context) =>
	handler(async () => {
		const existing = await resolveSession(context);
		if (existing) {
			// Already in a demo: hand back the same account rather than abandoning the
			// data they have been making, which is the thing conversion depends on.
			if (isDemo(existing.user.roles)) return json({ user: existing.user });
			return fail(409, 'You are already signed in to your own account.');
		}

		const limit = await checkRateLimit(`demo:${clientKey(context)}`, LIMIT);
		if (!limit.allowed) return tooManyRequests(limit.retryAfterMs);

		/*
		 * `asResponse` so Better Auth's own `Set-Cookie` reaches the browser — the
		 * session cookie is its to mint now, and rebuilding it by hand is exactly the
		 * kind of divergence this swap was meant to remove.
		 */
		const auth = getAuth(new URL(context.request.url));
		const opened = await auth.api.signInAnonymous({
			headers: context.request.headers,
			asResponse: true
		});

		if (!opened.ok) return fail(503, 'The demo is not available right now.');

		const { user } = (await opened.clone().json()) as { user: { id: string } };

		try {
			await cloneDemoAccount(user.id);
		} catch (cause) {
			if (cause instanceof DemoTemplateMissing) {
				console.error(cause);
				return fail(503, 'The demo is not available right now.');
			}
			throw cause;
		}

		return opened;
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
