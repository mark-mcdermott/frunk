import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	// Only allow editing own profile or if admin
	if (locals.user.uuid !== params.id && !locals.user.admin) {
		throw error(403, 'Forbidden');
	}

	const [profileUser] = await db
		.select({
			id: table.user.id,
			uuid: table.user.uuid,
			username: table.user.username,
			avatar: table.user.avatar,
			admin: table.user.admin
		})
		.from(table.user)
		.where(eq(table.user.uuid, params.id));

	if (!profileUser) {
		throw error(404, 'User not found');
	}

	const isAdminEditing = locals.user.admin === 1;

	return { profileUser, isAdminEditing };
};

export const actions: Actions = {
	update: async ({ request, params, locals, platform }) => {
		if (!locals.user) {
			throw error(401, 'Unauthorized');
		}

		// Only allow editing own profile or if admin
		if (locals.user.uuid !== params.id && !locals.user.admin) {
			throw error(403, 'Forbidden');
		}

		const formData = await request.formData();
		const username = formData.get('username') as string;
		const avatar = formData.get('avatar') as string;
		const avatarUpload = formData.get('avatarUpload') as string;

		if (!username || username.trim().length === 0) {
			return fail(400, { message: 'Username is required' });
		}

		// Handle avatar: upload to R2 if file provided, otherwise use URL
		let finalAvatar: string | null = null;
		if (avatarUpload && avatarUpload.startsWith('data:image/')) {
			// Parse the data URL
			const matches = avatarUpload.match(/^data:image\/(\w+);base64,(.+)$/);
			if (matches) {
				const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
				const base64Data = matches[2];
				const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

				// Generate unique filename
				const filename = `${crypto.randomUUID()}.${ext}`;

				// Upload to R2
				if (platform?.env?.R2_AVATARS) {
					try {
						await platform.env.R2_AVATARS.put(filename, binaryData, {
							httpMetadata: {
								contentType: `image/${matches[1]}`
							}
						});
						// Use the public R2 URL (assumes bucket is public or has custom domain)
						finalAvatar = `https://pub-8578b5b18a5e41269fa51ae28e78a0a8.r2.dev/${filename}`;
					} catch (e) {
						// R2 upload failed, fallback to base64
						console.error('R2 upload failed:', e);
						finalAvatar = avatarUpload;
					}
				} else {
					// Fallback to base64 if R2 not available (local dev)
					finalAvatar = avatarUpload;
				}
			}
		} else if (avatar?.trim()) {
			finalAvatar = avatar.trim();
		}

		try {
			await db
				.update(table.user)
				.set({
					username: username.trim(),
					avatar: finalAvatar
				})
				.where(eq(table.user.uuid, params.id));
		} catch (e) {
			return fail(400, { message: 'Username already taken' });
		}

		return redirect(302, `/users/${params.id}`);
	},

	delete: async ({ params, locals }) => {
		if (!locals.user) {
			throw error(401, 'Unauthorized');
		}

		// Only admins can delete users
		if (!locals.user.admin) {
			throw error(403, 'Forbidden');
		}

		// Prevent admin from deleting themselves
		if (params.id === locals.user.uuid) {
			throw error(400, 'Cannot delete yourself');
		}

		await db.delete(table.user).where(eq(table.user.uuid, params.id));

		return redirect(302, '/users');
	}
};
