import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw redirect(302, '/sign-in');
	}

	const [vehicle] = await db
		.select()
		.from(table.vehicles)
		.where(eq(table.vehicles.id, params.id));

	if (!vehicle) {
		throw error(404, 'Vehicle not found');
	}

	// Only allow viewing own vehicles
	if (vehicle.userId !== locals.user.uuid) {
		throw error(403, 'Forbidden');
	}

	// Get notes for this vehicle
	const notes = await db
		.select()
		.from(table.notes)
		.where(eq(table.notes.vehicleId, params.id))
		.orderBy(desc(table.notes.createdAt));

	// Get repairs for this vehicle with vendor info
	const repairs = await db
		.select({
			id: table.repairs.id,
			description: table.repairs.description,
			date: table.repairs.date,
			mileage: table.repairs.mileage,
			cost: table.repairs.cost,
			status: table.repairs.status,
			vendorId: table.repairs.vendorId,
			vendorName: table.vendors.name
		})
		.from(table.repairs)
		.leftJoin(table.vendors, eq(table.repairs.vendorId, table.vendors.id))
		.where(eq(table.repairs.vehicleId, params.id))
		.orderBy(desc(table.repairs.date));

	// Get user's vendors for the dropdown
	const vendors = await db
		.select()
		.from(table.vendors)
		.where(eq(table.vendors.userId, locals.user.uuid))
		.orderBy(table.vendors.name);

	return { vehicle, notes, repairs, vendors };
};

export const actions: Actions = {
	createNote: async ({ request, params, locals, platform }) => {
		if (!locals.user) {
			throw error(401, 'Unauthorized');
		}

		// Verify vehicle ownership
		const [vehicle] = await db
			.select()
			.from(table.vehicles)
			.where(eq(table.vehicles.id, params.id));

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

		await db.insert(table.notes).values({
			uuid: noteUuid,
			title: title.trim(),
			body: body?.trim() || null,
			imageUrl,
			type: 'note',
			vehicleId: params.id
		});

		return { success: true };
	},

	deleteNote: async ({ request, locals, platform }) => {
		if (!locals.user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const noteUuid = formData.get('noteUuid') as string;

		// Get note and verify ownership through vehicle
		const [note] = await db
			.select()
			.from(table.notes)
			.where(eq(table.notes.uuid, noteUuid));

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
		await db.delete(table.notes).where(eq(table.notes.uuid, noteUuid));

		return { success: true };
	},

	createRepair: async ({ request, params, locals }) => {
		if (!locals.user) {
			throw error(401, 'Unauthorized');
		}

		// Verify vehicle ownership
		const [vehicle] = await db
			.select()
			.from(table.vehicles)
			.where(eq(table.vehicles.id, params.id));

		if (!vehicle || vehicle.userId !== locals.user.uuid) {
			throw error(403, 'Forbidden');
		}

		const formData = await request.formData();
		const description = formData.get('description') as string;
		const dateStr = formData.get('date') as string;
		const mileageStr = formData.get('mileage') as string;
		const costStr = formData.get('cost') as string;
		const vendorId = formData.get('vendorId') as string;
		const status = formData.get('status') as string || 'completed';

		if (!description?.trim()) {
			return fail(400, { message: 'Description is required' });
		}

		if (!dateStr) {
			return fail(400, { message: 'Date is required' });
		}

		const repairId = crypto.randomUUID();
		const mileage = mileageStr ? parseInt(mileageStr, 10) : null;
		const cost = costStr ? Math.round(parseFloat(costStr) * 100) : null; // Convert to cents

		await db.insert(table.repairs).values({
			id: repairId,
			vehicleId: params.id,
			vendorId: vendorId || null,
			description: description.trim(),
			date: new Date(dateStr),
			mileage,
			cost,
			status
		});

		return { success: true };
	},

	deleteRepair: async ({ request, params, locals }) => {
		if (!locals.user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const repairId = formData.get('repairId') as string;

		// Get repair and verify ownership through vehicle
		const [repair] = await db
			.select()
			.from(table.repairs)
			.where(eq(table.repairs.id, repairId));

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

		// Delete repair record (notes will cascade delete due to FK)
		await db.delete(table.repairs).where(eq(table.repairs.id, repairId));

		return { success: true };
	}
};
