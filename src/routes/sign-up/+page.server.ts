import { encodeBase32LowerCase } from '@oslojs/encoding';
import { fail, redirect } from '@sveltejs/kit';
import * as auth from '$lib/server/auth';
import { db } from '$lib/server/db';
import { hashPassword } from '$lib/server/password';
import * as table from '$lib/server/db/schema';
import { sendVerificationEmail } from '$lib/server/email';
import type { Actions, PageServerLoad } from './$types';

function generateVerificationToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		return redirect(302, '/');
	}
	return {};
};

export const actions: Actions = {
	register: async (event) => {
		const formData = await event.request.formData();
		const username = formData.get('username');
		const password = formData.get('password');

		if (!validateEmail(username)) {
			return fail(400, { message: 'Invalid email address' });
		}
		if (!validatePassword(password)) {
			return fail(400, { message: 'Invalid password' });
		}

		const userUuid = generateUserId();
		const passwordHash = await hashPassword(password);
		const verificationToken = generateVerificationToken();
		const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

		try {
			await db.insert(table.user).values({
				uuid: userUuid,
				username,
				passwordHash,
				emailVerificationToken: verificationToken,
				emailVerificationExpires: verificationExpires
			});

			// Send verification email (don't block registration if email fails)
			const baseUrl = event.url.origin;
			try {
				await sendVerificationEmail(username, verificationToken, baseUrl);
			} catch (emailError) {
				console.error('Failed to send verification email:', emailError);
				// Continue with registration even if email fails
			}

			const sessionToken = auth.generateSessionToken();
			const session = await auth.createSession(sessionToken, userUuid);
			auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
		} catch (error) {
			console.error('Registration error:', error);
			return fail(500, { message: 'An error has occurred' });
		}
		return redirect(302, `/users/${userUuid}`);
	}
};

function generateUserId() {
	// ID with 120 bits of entropy, or about the same as UUID v4.
	const bytes = crypto.getRandomValues(new Uint8Array(15));
	const id = encodeBase32LowerCase(bytes);
	return id;
}

function validateEmail(email: unknown): email is string {
	return (
		typeof email === 'string' &&
		email.length >= 3 &&
		email.length <= 255 &&
		/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
	);
}

function validatePassword(password: unknown): password is string {
	return typeof password === 'string' && password.length >= 6 && password.length <= 255;
}
