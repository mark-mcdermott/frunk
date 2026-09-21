import type { APIRoute } from 'astro';
import { APIError } from 'better-auth/api';
import { z } from 'zod';
import { isDemo } from '../../../lib/roles';
import { getAuth } from '../../../lib/server/auth/config';
import { requireSession } from '../_lib/guard';
import { fail, handler, noContent, readJson } from '../_lib/http';

export const prerender = false;

const setPasswordSchema = z.object({ password: z.string().min(8).max(128) });

/**
 * Gives a password to an account that has none — a converted demo, or anyone who only
 * ever signed in with a passkey. Better Auth's `setPassword` is deliberately
 * server-only, so this is the door to it; it refuses if a password already exists
 * (`change-password` is for that, and needs the current one).
 *
 * A demo account is refused outright: Decision 5 makes the passkey the way to keep a
 * demo, and a password on an account with a placeholder address would be a credential
 * nobody could use.
 */
export const POST: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		if (isDemo(user.roles)) {
			return fail(403, 'A demo account is kept by adding a passkey, not a password');
		}

		const { password } = await readJson(context.request, setPasswordSchema);
		const auth = getAuth(new URL(context.request.url));

		try {
			await auth.api.setPassword({
				body: { newPassword: password },
				headers: context.request.headers
			});
		} catch (cause) {
			if (cause instanceof APIError) {
				const alreadySet = /already/i.test(cause.message);
				return fail(alreadySet ? 409 : cause.statusCode, cause.message);
			}
			throw cause;
		}

		return noContent();
	});
