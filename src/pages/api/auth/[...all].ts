import type { APIRoute } from 'astro';
import { getAuth } from '../../../lib/server/auth/config';
import { isNativeOrigin } from '../../../lib/server/origins';
import { relayingCookies, withRelayedCookies } from '../../../lib/server/relay';

export const prerender = false;

/**
 * Every Better Auth route, mounted at `/api/auth/*`.
 *
 * One catch-all replaces the hand-rolled ceremonies that used to live in
 * `login/`, `register/` and `totp/` — Better Auth routes internally by path, so
 * sign-in, sign-up, passkey ceremonies, TOTP, verification and the anonymous
 * (demo) flow all arrive here.
 *
 * The instance is resolved per request because the relying party is derived from
 * the request URL on previews and localhost — see `config.ts`.
 *
 * The bundled native app cannot hold cookies for this origin, so its challenge
 * cookies travel in a header instead — see `src/lib/server/relay.ts`.
 */
const handle: APIRoute = async ({ request }) => {
	const auth = getAuth(new URL(request.url));
	if (!isNativeOrigin(request.headers.get('origin'))) return auth.handler(request);
	return relayingCookies(await auth.handler(withRelayedCookies(request)));
};

export const GET = handle;
export const POST = handle;
