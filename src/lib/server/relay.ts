/**
 * A cookie jar over headers, for the bundled native app.
 *
 * The app authenticates with a bearer token, which covers the session. But three of
 * Better Auth's flows also park short-lived state in a cookie between two requests:
 * the passkey ceremony (its challenge), a recovery-enrolled sign-in (the two-factor
 * challenge) and "trust this device". A webview on `capacitor://localhost` calling
 * `frunk.cloud` is cross-site, where WebKit drops third-party cookies outright and a
 * script can neither read `Set-Cookie` nor write `Cookie` — so those flows would fail
 * at their second step with nothing to say why.
 *
 * So for native origins the auth route relays them: cookies Better Auth sets go out in
 * `x-frunk-relay` as `name=value` pairs, the app sends back what it holds in the same
 * header, and they are folded into `Cookie` before Better Auth sees the request. The
 * session cookie is left out on the way back — the bearer token is the one source of
 * that, and a second copy could only disagree with it.
 */
export const RELAY_HEADER = 'x-frunk-relay';

const SESSION_COOKIE = /session_(token|data)$/;

/** The request Better Auth should see: relayed cookies folded into `Cookie`. */
export function withRelayedCookies(request: Request): Request {
	const relayed = request.headers.get(RELAY_HEADER);
	if (!relayed) return request;

	const headers = new Headers(request.headers);
	const existing = headers.get('cookie');
	headers.set('cookie', existing ? `${existing}; ${relayed}` : relayed);
	headers.delete(RELAY_HEADER);
	return new Request(request, { headers });
}

/** The response the app should see: what was set (or cleared) named in the relay header. */
export function relayingCookies(response: Response): Response {
	const pairs = response.headers
		.getSetCookie()
		.map((cookie) => cookie.split(';')[0]?.trim() ?? '')
		.filter((pair) => pair && !SESSION_COOKIE.test(pair.split('=')[0] ?? ''));
	if (pairs.length === 0) return response;

	const headers = new Headers(response.headers);
	headers.set(RELAY_HEADER, pairs.join('; '));
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
}
