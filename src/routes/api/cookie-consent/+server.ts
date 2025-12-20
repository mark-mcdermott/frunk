import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ consent: null });
	}

	const [user] = await db
		.select({ cookieConsent: table.user.cookieConsent })
		.from(table.user)
		.where(eq(table.user.uuid, locals.user.uuid));

	return json({ consent: user?.cookieConsent || null });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const { essential, analytics } = await request.json();

	const consent = {
		essential: Boolean(essential),
		analytics: Boolean(analytics),
		timestamp: Date.now()
	};

	// If user is logged in, save to database
	if (locals.user) {
		await db
			.update(table.user)
			.set({ cookieConsent: consent })
			.where(eq(table.user.uuid, locals.user.uuid));
	}

	return json({ success: true, consent });
};
