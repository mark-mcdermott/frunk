import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { sendContactEmail } from '$lib/server/email';

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const email = formData.get('email') as string;
		const message = formData.get('message') as string;

		// Validation
		if (!name || name.trim().length === 0) {
			return fail(400, { error: 'Name is required', name, email, message });
		}

		if (!email || email.trim().length === 0) {
			return fail(400, { error: 'Email is required', name, email, message });
		}

		// Basic email validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return fail(400, { error: 'Please enter a valid email address', name, email, message });
		}

		if (!message || message.trim().length === 0) {
			return fail(400, { error: 'Message is required', name, email, message });
		}

		if (message.trim().length < 10) {
			return fail(400, { error: 'Message must be at least 10 characters', name, email, message });
		}

		try {
			await sendContactEmail({
				name: name.trim(),
				email: email.trim(),
				message: message.trim()
			});

			return { success: true };
		} catch (error) {
			console.error('Failed to send contact email:', error);
			return fail(500, { error: 'Failed to send message. Please try again later.', name, email, message });
		}
	}
};
