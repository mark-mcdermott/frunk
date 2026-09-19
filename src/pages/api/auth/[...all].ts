import type { APIRoute } from 'astro';
import { getAuth } from '../../../lib/server/auth/config';

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
 */
const handle: APIRoute = ({ request }) => getAuth(new URL(request.url)).handler(request);

export const GET = handle;
export const POST = handle;
