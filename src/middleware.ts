import { defineMiddleware } from 'astro:middleware';
import { RELAY_HEADER } from './lib/server/relay';

/**
 * Two rules about where a request may come from.
 *
 * **CORS, for the bundled native app and nothing else.** The applet inside the app is
 * a different origin from the site (`src/lib/server/origins.ts`), so the webview
 * preflights its API calls and hides response headers it was not told to expose —
 * `set-auth-token`, which the bearer session depends on, and the cookie relay. Only
 * native origins are answered, and without credentials: the app authenticates with a
 * token, never a cookie.
 *
 * **The cross-site form check, restated.** Astro's own `checkOrigin` refuses any
 * mutating request that is form-encoded or has no content type unless its `Origin` is
 * the site's — and a native origin never is, so a body-less `DELETE` from the app would
 * be a 403. It is switched off in `astro.config.mjs` and enforced here with the one
 * exemption: a native origin may send them, because the attack the check exists for —
 * a hostile page submitting a form with the visitor's cookies — needs an origin no
 * browser will let a page claim, and cookies the app does not use.
 */
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const FORM_TYPES = ['application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain'];
const ALLOW_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const DEFAULT_ALLOW_HEADERS = `authorization, content-type, ${RELAY_HEADER}`;
const EXPOSE_HEADERS = ['set-auth-token', RELAY_HEADER, 'content-disposition', 'retry-after'];

function crossSiteForm(request: Request, url: URL): boolean {
	if (request.headers.get('origin') === url.origin) return false;
	const type = request.headers.get('content-type')?.toLowerCase();
	// No content type at all is how a body-less form-less mutation arrives; Astro
	// treats it as form-like, and so does this.
	return !type || FORM_TYPES.some((form) => type.startsWith(form));
}

function withCors(response: Response, origin: string): Response {
	const headers = new Headers(response.headers);
	headers.set('access-control-allow-origin', origin);
	headers.append('vary', 'origin');
	// Better Auth's bearer plugin exposes its own header; keep whatever is already there.
	const exposed = new Set(
		[...(headers.get('access-control-expose-headers') ?? '').split(','), ...EXPOSE_HEADERS]
			.map((name) => name.trim().toLowerCase())
			.filter(Boolean)
	);
	headers.set('access-control-expose-headers', [...exposed].join(', '));
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
}

export const onRequest = defineMiddleware(async ({ request, url }, next) => {
	const api = url.pathname.startsWith('/api/');
	const mutating = MUTATING.has(request.method);

	// Pages are static and read-only; headers are not even available while prerendering.
	if (!api && !mutating) return next();

	/*
	 * Imported here, not at the top: `origins.ts` reads `astro:env/server`, and this
	 * module is also loaded while the static pages are prerendered — where a required
	 * secret such as DATABASE_URL does not exist and merely importing the env module
	 * fails the build. Prerendering never gets past the line above.
	 */
	const { isNativeOrigin } = await import('./lib/server/origins');
	const origin = request.headers.get('origin');
	const native = isNativeOrigin(origin);

	if (api && native && request.method === 'OPTIONS') {
		return new Response(null, {
			status: 204,
			headers: {
				'access-control-allow-origin': origin,
				'access-control-allow-methods': ALLOW_METHODS,
				'access-control-allow-headers':
					request.headers.get('access-control-request-headers') ?? DEFAULT_ALLOW_HEADERS,
				'access-control-max-age': '86400',
				vary: 'origin'
			}
		});
	}

	if (mutating && !native && crossSiteForm(request, url)) {
		return new Response('Cross-site POST form submissions are forbidden', { status: 403 });
	}

	const response = await next();
	return api && native ? withCors(response, origin) : response;
});
