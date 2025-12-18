import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token');

	if (!token) {
		return {
			success: false,
			message: 'No verification token provided'
		};
	}

	// Find user with this token
	const users = await db
		.select()
		.from(table.user)
		.where(eq(table.user.emailVerificationToken, token));

	const user = users.at(0);

	if (!user) {
		return {
			success: false,
			message: 'Invalid verification token'
		};
	}

	// Check if token is expired
	if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
		return {
			success: false,
			message: 'Verification token has expired. Please request a new one.'
		};
	}

	// Mark email as verified
	await db
		.update(table.user)
		.set({
			emailVerified: 1,
			emailVerificationToken: null,
			emailVerificationExpires: null
		})
		.where(eq(table.user.uuid, user.uuid));

	return {
		success: true,
		message: 'Email verified successfully!'
	};
};
