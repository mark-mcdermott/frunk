import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw redirect(302, '/');
	}

	// Get repair with vendor info
	const [repair] = await db
		.select({
			id: table.repairs.id,
			vehicleId: table.repairs.vehicleId,
			vendorId: table.repairs.vendorId,
			description: table.repairs.description,
			date: table.repairs.date,
			mileage: table.repairs.mileage,
			cost: table.repairs.cost,
			status: table.repairs.status,
			createdAt: table.repairs.createdAt,
			vendorName: table.vendors.name
		})
		.from(table.repairs)
		.leftJoin(table.vendors, eq(table.repairs.vendorId, table.vendors.id))
		.where(eq(table.repairs.id, params.repairId));

	if (!repair) {
		throw error(404, 'Repair not found');
	}

	// Get vehicle and verify ownership
	const [vehicle] = await db
		.select()
		.from(table.vehicles)
		.where(eq(table.vehicles.id, repair.vehicleId));

	if (!vehicle || vehicle.userId !== locals.user.uuid) {
		throw error(403, 'Forbidden');
	}

	// Get notes for this repair
	const notes = await db
		.select()
		.from(table.notes)
		.where(eq(table.notes.repairId, params.repairId))
		.orderBy(desc(table.notes.createdAt));

	return { repair, vehicle, notes, basePath: '/demo' };
};

export const actions: Actions = {
	createNote: async ({ request, params, locals, platform }) => {
		if (!locals.user) {
			throw error(401, 'Unauthorized');
		}

		// Verify repair ownership through vehicle
		const [repair] = await db
			.select()
			.from(table.repairs)
			.where(eq(table.repairs.id, params.repairId));

		if (!repair) {
			throw error(404, 'Repair not found');
		}

		const [vehicle] = await db
			.select()
			.from(table.vehicles)
			.where(eq(table.vehicles.id, repair.vehicleId));

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
			vehicleId: params.id,
			repairId: params.repairId
		});

		return { success: true };
	},

	deleteNote: async ({ request, locals, platform }) => {
		if (!locals.user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const noteUuid = formData.get('noteUuid') as string;

		// Get note and verify ownership through repair -> vehicle
		const [note] = await db
			.select()
			.from(table.notes)
			.where(eq(table.notes.uuid, noteUuid));

		if (!note) {
			throw error(404, 'Note not found');
		}

		const [repair] = await db
			.select()
			.from(table.repairs)
			.where(eq(table.repairs.id, note.repairId!));

		if (!repair) {
			throw error(404, 'Repair not found');
		}

		const [vehicle] = await db
			.select()
			.from(table.vehicles)
			.where(eq(table.vehicles.id, repair.vehicleId));

		if (!vehicle || vehicle.userId !== locals.user.uuid) {
			throw error(403, 'Forbidden');
		}

		// Delete image from R2 if it exists
		if (note.imageUrl?.includes('r2.dev') && platform?.env?.R2_AVATARS && !import.meta.env.DEV) {
			try {
				const key = note.imageUrl.split('r2.dev/')[1];
				await platform.env.R2_AVATARS.delete(key);
			} catch (e) {
				console.error('R2 delete failed:', e);
			}
		}

		await db.delete(table.notes).where(eq(table.notes.uuid, noteUuid));

		return { success: true };
	}
};
