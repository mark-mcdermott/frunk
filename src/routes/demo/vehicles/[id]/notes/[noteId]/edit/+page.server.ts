import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw redirect(302, '/');
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

	// Get child notes
	const childNotes = await db
		.select()
		.from(table.notes)
		.where(eq(table.notes.parentNoteId, params.noteId))
		.orderBy(desc(table.notes.createdAt));

	return { note, vehicle, childNotes };
};

export const actions: Actions = {
	update: async ({ request, params, locals, platform }) => {
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
			// Delete old image first if exists (only on production with real R2)
			if (note.imageUrl?.includes('r2.dev') && platform?.env?.R2_AVATARS && !import.meta.env.DEV) {
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

				// Only use R2 in production (platform emulation in dev doesn't work with real R2)
				if (platform?.env?.R2_AVATARS && !import.meta.env.DEV) {
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
					// In dev mode, store base64 directly
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

		throw redirect(302, `/demo/vehicles/${params.id}/notes/${params.noteId}`);
	},

	delete: async ({ params, locals, platform }) => {
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

		// Delete image from R2 if it exists (only in production)
		if (note.imageUrl?.includes('r2.dev') && platform?.env?.R2_AVATARS && !import.meta.env.DEV) {
			try {
				const key = note.imageUrl.split('r2.dev/')[1];
				await platform.env.R2_AVATARS.delete(key);
			} catch (e) {
				console.error('R2 delete failed:', e);
			}
		}

		// Delete note record
		await db.delete(table.notes).where(eq(table.notes.uuid, params.noteId));

		throw redirect(302, `/demo/vehicles/${params.id}`);
	},

	createNote: async ({ request, params, locals, platform }) => {
		if (!locals.user) {
			throw error(401, 'Unauthorized');
		}

		// Get parent note and verify ownership
		const [parentNote] = await db
			.select()
			.from(table.notes)
			.where(eq(table.notes.uuid, params.noteId));

		if (!parentNote) {
			throw error(404, 'Parent note not found');
		}

		if (!parentNote.vehicleId) {
			return fail(400, { message: 'Parent note has no vehicle' });
		}

		const [vehicle] = await db
			.select()
			.from(table.vehicles)
			.where(eq(table.vehicles.id, parentNote.vehicleId));

		if (!vehicle || vehicle.userId !== locals.user.uuid) {
			throw error(403, 'Forbidden');
		}

		const formData = await request.formData();
		const title = formData.get('title') as string;
		const body = formData.get('body') as string | null;
		const fileData = formData.get('fileData') as string | null;

		if (!title?.trim()) {
			return fail(400, { message: 'Title is required' });
		}

		const noteUuid = crypto.randomUUID();
		let imageUrl: string | null = null;

		// Handle optional image upload
		if (fileData && fileData.startsWith('data:')) {
			const matches = fileData.match(/^data:([^;]+);base64,(.+)$/);
			if (matches) {
				const mimeType = matches[1];
				const base64Data = matches[2];
				const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
				const ext = mimeType.split('/')[1] || 'jpg';
				const filename = `notes/${noteUuid}/${crypto.randomUUID()}.${ext}`;

				// Only use R2 in production
				if (platform?.env?.R2_AVATARS && !import.meta.env.DEV) {
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
					// In dev mode, store base64 directly
					imageUrl = fileData;
				}
			}
		}

		await db.insert(table.notes).values({
			uuid: noteUuid,
			title: title.trim(),
			body: body?.trim() || null,
			imageUrl,
			type: 'note',
			vehicleId: parentNote.vehicleId,
			parentNoteId: params.noteId
		});

		return { success: true };
	},

	deleteChildNote: async ({ request, params, locals, platform }) => {
		if (!locals.user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const noteUuid = formData.get('noteUuid') as string;

		// Get the note to delete
		const [noteToDelete] = await db
			.select()
			.from(table.notes)
			.where(eq(table.notes.uuid, noteUuid));

		if (!noteToDelete) {
			throw error(404, 'Note not found');
		}

		// Verify ownership through vehicle
		const [vehicle] = await db
			.select()
			.from(table.vehicles)
			.where(eq(table.vehicles.id, noteToDelete.vehicleId!));

		if (!vehicle || vehicle.userId !== locals.user.uuid) {
			throw error(403, 'Forbidden');
		}

		// Recursively delete all descendant notes
		async function deleteNoteAndDescendants(uuid: string) {
			// Find all child notes
			const children = await db
				.select()
				.from(table.notes)
				.where(eq(table.notes.parentNoteId, uuid));

			// Recursively delete children first
			for (const child of children) {
				await deleteNoteAndDescendants(child.uuid);
			}

			// Get the note to delete its image
			const [note] = await db
				.select()
				.from(table.notes)
				.where(eq(table.notes.uuid, uuid));

			// Delete image from R2 if exists (only in production)
			if (note?.imageUrl?.includes('r2.dev') && platform?.env?.R2_AVATARS && !import.meta.env.DEV) {
				try {
					const key = note.imageUrl.split('r2.dev/')[1];
					await platform.env.R2_AVATARS.delete(key);
				} catch (e) {
					console.error('R2 delete failed:', e);
				}
			}

			// Delete the note
			await db.delete(table.notes).where(eq(table.notes.uuid, uuid));
		}

		await deleteNoteAndDescendants(noteUuid);

		return { success: true };
	}
};
