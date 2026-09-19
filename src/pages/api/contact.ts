import type { APIRoute } from 'astro';
import { sendContactEmail } from '../../lib/server/email';
import { checkRateLimit } from '../../lib/server/auth/rate-limit';
import { contactSchema } from './_lib/schemas';
import { handler, json, readJson, tooManyRequests } from './_lib/http';

export const prerender = false;

/**
 * The only unauthenticated endpoint that causes frunk to send mail, which makes it the
 * only one an anonymous visitor can use to spend money and burn sending reputation. So it
 * is rate limited by IP with the same Postgres-backed limiter the auth ceremonies use — an
 * in-memory counter would reset on every cold start and limit nothing.
 *
 * Five an hour is generous for a human with something to say and useless for a script.
 */
const LIMIT = { limit: 5, windowMs: 60 * 60 * 1000 };

/**
 * Behind Vercel, `x-forwarded-for` is a comma-separated chain and the client is the first
 * entry. `context.clientAddress` would be the edge, which is the same for everyone.
 */
function clientKey(request: Request, fallback: string): string {
	const forwarded = request.headers.get('x-forwarded-for');
	const ip = forwarded?.split(',')[0]?.trim() || fallback;
	return `contact:${ip}`;
}

export const POST: APIRoute = ({ request, clientAddress }) =>
	handler(async () => {
		const decision = await checkRateLimit(clientKey(request, clientAddress), LIMIT);
		if (!decision.allowed) return tooManyRequests(decision.retryAfterMs);

		const body = await readJson(request, contactSchema);
		await sendContactEmail(body);

		return json({ sent: true }, 202);
	});
