import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { sendVerificationEmail, generateVerificationToken } from '$lib/server/email';
import { isAdmin } from '$lib/roles';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const [profileUser] = await db
		.select({
			id: table.user.id,
			uuid: table.user.uuid,
			username: table.user.username,
			avatar: table.user.avatar,
			roles: table.user.roles,
			emailVerified: table.user.emailVerified
		})
		.from(table.user)
		.where(eq(table.user.uuid, params.id));

	if (!profileUser) {
		throw error(404, 'User not found');
	}

	// Only allow viewing own profile or if admin
	if (locals.user.uuid !== params.id && !isAdmin(locals.user.roles)) {
		throw error(403, 'Forbidden');
	}

	return { profileUser };
};

export const actions: Actions = {
	resendVerification: async ({ params, locals, url }) => {
		if (!locals.user || locals.user.uuid !== params.id) {
			return fail(403, { message: 'Forbidden' });
		}

		const [user] = await db
			.select()
			.from(table.user)
			.where(eq(table.user.uuid, params.id));

		if (!user) {
			return fail(404, { message: 'User not found' });
		}

		if (user.emailVerified === 1) {
			return fail(400, { message: 'Email already verified' });
		}

		const verificationToken = generateVerificationToken();
		const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

		await db
			.update(table.user)
			.set({
				emailVerificationToken: verificationToken,
				emailVerificationExpires: verificationExpires
			})
			.where(eq(table.user.uuid, params.id));

		try {
			await sendVerificationEmail(user.username, verificationToken, url.origin);
			return { success: true, message: 'Verification email sent!' };
		} catch (e) {
			console.error('Failed to send verification email:', e);
			return fail(500, { message: 'Failed to send email. Please try again.' });
		}
	}
};
