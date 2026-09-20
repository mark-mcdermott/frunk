import { RP_ID, RP_ORIGIN } from 'astro:env/server';

/**
 * WebAuthn relying-party identity — the "who is asking" half of every ceremony.
 *
 * A passkey is bound to an RP ID, and the browser will only release it to an origin
 * that matches. So this pair decides which credentials work where, and getting it
 * wrong does not fail loudly: it silently creates passkeys that can never sign in.
 *
 * `RP_ID` / `RP_ORIGIN` pin it in production (Phase 6 sets both). When they are unset
 * it is derived from the request, which is what makes `localhost:4321` and Vercel's
 * per-deploy preview hostnames work without configuration — every preview gets a
 * different subdomain, so nothing static could cover them. Deriving is safe on Vercel
 * because a request only reaches the function for a hostname assigned to the project,
 * but production should still pin it: an authoritative value cannot be influenced by a
 * request at all.
 */

export const RP_NAME = 'Frunk';

export interface RelyingParty {
	id: string;
	origin: string;
}

export function relyingParty(requestUrl: URL): RelyingParty {
	const origin = RP_ORIGIN ?? requestUrl.origin;
	return { id: RP_ID ?? new URL(origin).hostname, origin };
}
