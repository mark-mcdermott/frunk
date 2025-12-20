import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw redirect(302, '/sign-in');
	}

	// Get the note
	const [note] = await db
		.select()
		.from(table.notes)
		.where(eq(table.notes.uuid, params.noteId));

	if (!note) {
		throw error(404, 'Note not found');
	}

	// Get the vehicle and verify ownership
	const [vehicle] = await db
		.select()
		.from(table.vehicles)
		.where(eq(table.vehicles.id, note.vehicleId!));

	if (!vehicle) {
		throw error(404, 'Vehicle not found');
	}

	if (vehicle.userId !== locals.user.uuid) {
		throw error(403, 'Forbidden');
	}

	return { note, vehicle };
};

export const actions: Actions = {
	default: async ({ request, params, locals, platform }) => {
		if (!locals.user) {
			throw error(401, 'Unauthorized');
		}

		// Get note and verify ownership
		const [note] = await db
			.select()
			.from(table.notes)
			.where(eq(table.notes.uuid, params.noteId));

		if (!note) {
			throw error(404, 'Note not found');
		}

		const [vehicle] = await db
			.select()
			.from(table.vehicles)
			.where(eq(table.vehicles.id, note.vehicleId!));

		if (!vehicle || vehicle.userId !== locals.user.uuid) {
			throw error(403, 'Forbidden');
		}

		const formData = await request.formData();
		const title = formData.get('title') as string;
		const body = formData.get('body') as string | null;
		const fileData = formData.get('fileData') as string | null;
		const removeImage = formData.get('removeImage') === 'true';

		if (!title?.trim()) {
			return fail(400, { message: 'Title is required' });
		}

		let imageUrl = note.imageUrl;

		// Handle image removal
		if (removeImage && note.imageUrl) {
			// Delete old image from R2
			if (note.imageUrl.includes('r2.dev') && platform?.env?.R2_AVATARS) {
				try {
					const key = note.imageUrl.split('r2.dev/')[1];
					await platform.env.R2_AVATARS.delete(key);
				} catch (e) {
					console.error('R2 delete failed:', e);
				}
			}
			imageUrl = null;
		}

		// Handle new image upload
		if (fileData && fileData.startsWith('data:')) {
			// Delete old image first if exists
			if (note.imageUrl?.includes('r2.dev') && platform?.env?.R2_AVATARS) {
				try {
					const key = note.imageUrl.split('r2.dev/')[1];
					await platform.env.R2_AVATARS.delete(key);
				} catch (e) {
					console.error('R2 delete failed:', e);
				}
			}

			const matches = fileData.match(/^data:([^;]+);base64,(.+)$/);
			if (matches) {
				const mimeType = matches[1];
				const base64Data = matches[2];
				const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
				const ext = mimeType.split('/')[1] || 'jpg';
				const filename = `notes/${params.noteId}/${crypto.randomUUID()}.${ext}`;

				if (platform?.env?.R2_AVATARS) {
					try {
						await platform.env.R2_AVATARS.put(filename, binaryData, {
							httpMetadata: { contentType: mimeType }
						});
						imageUrl = `https://pub-8578b5b18a5e41269fa51ae28e78a0a8.r2.dev/${filename}`;
					} catch (e) {
						console.error('R2 upload failed:', e);
						return fail(500, { message: 'Failed to upload image' });
					}
				} else {
					imageUrl = fileData;
				}
			}
		}

		// Update note
		await db
			.update(table.notes)
			.set({
				title: title.trim(),
				body: body?.trim() || null,
				imageUrl,
				updatedAt: new Date()
			})
			.where(eq(table.notes.uuid, params.noteId));

		throw redirect(302, `/vehicles/${params.id}/notes/${params.noteId}`);
	}
};
