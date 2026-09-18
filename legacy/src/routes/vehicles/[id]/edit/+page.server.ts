import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

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

	if (vehicle.userId !== locals.user.uuid) {
		throw error(403, 'Forbidden');
	}

	return { vehicle };
};

export const actions: Actions = {
	update: async ({ request, params, locals, platform }) => {
		if (!locals.user) {
			throw redirect(302, '/sign-in');
		}

		const [vehicle] = await db
			.select()
			.from(table.vehicles)
			.where(eq(table.vehicles.id, params.id));

		if (!vehicle || vehicle.userId !== locals.user.uuid) {
			throw error(403, 'Forbidden');
		}

		const formData = await request.formData();
		const make = formData.get('make') as string;
		const model = formData.get('model') as string;
		const yearStr = formData.get('year') as string;
		const vin = formData.get('vin') as string;
		const fileData = formData.get('fileData') as string | null;
		const removeImage = formData.get('removeImage') === 'true';

		if (!make?.trim()) {
			return fail(400, { message: 'Make is required' });
		}

		if (!model?.trim()) {
			return fail(400, { message: 'Model is required' });
		}

		const year = parseInt(yearStr, 10);
		if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 2) {
			return fail(400, { message: 'Please enter a valid year' });
		}

		let image = vehicle.image;

		// Handle image removal
		if (removeImage && vehicle.image) {
			// Delete old image from R2
			if (vehicle.image.includes('r2.dev') && platform?.env?.R2_AVATARS && !import.meta.env.DEV) {
				try {
					const key = vehicle.image.split('r2.dev/')[1];
					await platform.env.R2_AVATARS.delete(key);
				} catch (e) {
					console.error('R2 delete failed:', e);
				}
			}
			image = null;
		}

		// Handle new image upload
		if (fileData && fileData.startsWith('data:')) {
			// Delete old image first if exists (only on production with real R2)
			if (vehicle.image?.includes('r2.dev') && platform?.env?.R2_AVATARS && !import.meta.env.DEV) {
				try {
					const key = vehicle.image.split('r2.dev/')[1];
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
				const filename = `vehicles/${params.id}/${crypto.randomUUID()}.${ext}`;

				// Only use R2 in production (platform emulation in dev doesn't work with real R2)
				if (platform?.env?.R2_AVATARS && !import.meta.env.DEV) {
					try {
						await platform.env.R2_AVATARS.put(filename, binaryData, {
							httpMetadata: { contentType: mimeType }
						});
						image = `https://pub-8578b5b18a5e41269fa51ae28e78a0a8.r2.dev/${filename}`;
					} catch (e) {
						console.error('R2 upload failed:', e);
						return fail(500, { message: 'Failed to upload image' });
					}
				} else {
					// In dev mode, store base64 directly
					image = fileData;
				}
			}
		}

		await db
			.update(table.vehicles)
			.set({
				make: make.trim(),
				model: model.trim(),
				year,
				vin: vin?.trim() || null,
				image,
				updatedAt: new Date()
			})
			.where(eq(table.vehicles.id, params.id));

		throw redirect(302, `/vehicles/${params.id}`);
	},

	delete: async ({ params, locals, platform }) => {
		if (!locals.user) {
			throw redirect(302, '/sign-in');
		}

		const [vehicle] = await db
			.select()
			.from(table.vehicles)
			.where(eq(table.vehicles.id, params.id));

		if (!vehicle || vehicle.userId !== locals.user.uuid) {
			throw error(403, 'Forbidden');
		}

		// Delete image from R2 if exists (only in production)
		if (vehicle.image?.includes('r2.dev') && platform?.env?.R2_AVATARS && !import.meta.env.DEV) {
			try {
				const key = vehicle.image.split('r2.dev/')[1];
				await platform.env.R2_AVATARS.delete(key);
			} catch (e) {
				console.error('R2 delete failed:', e);
			}
		}

		await db.delete(table.vehicles).where(eq(table.vehicles.id, params.id));

		throw redirect(302, '/vehicles');
	}
};
