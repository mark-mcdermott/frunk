import type { APIRoute } from 'astro';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '../../../lib/server/db';
import * as table from '../../../lib/server/db/schema';
import { deleteManagedFiles } from '../../../lib/server/files';
import { ownedGallery, requireSession } from '../_lib/guard';
import { handler, json, noContent, notFound, readJson } from '../_lib/http';
import { updateGallerySchema } from '../_lib/schemas';

export const prerender = false;

export const GET: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const id = context.params.id;
		if (!id) return notFound('Gallery not found');

		const gallery = await ownedGallery(id, user.id);

		const photos = await getDb()
			.select()
			.from(table.vehiclePhotos)
			.where(eq(table.vehiclePhotos.galleryId, id))
			.orderBy(table.vehiclePhotos.order, desc(table.vehiclePhotos.createdAt));

		return json({ gallery: { ...gallery, photos } });
	});

export const PATCH: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const id = context.params.id;
		if (!id) return notFound('Gallery not found');

		await ownedGallery(id, user.id);
		const { photoOrder, ...fields } = await readJson(context.request, updateGallerySchema);
		const db = getDb();

		/*
		 * Reordering rewrites `order` from the array index. Only photos already in
		 * this gallery are touched, so an id from another gallery in the payload is
		 * ignored rather than silently moved.
		 */
		if (photoOrder?.length) {
			const existing = await db
				.select({ id: table.vehiclePhotos.id })
				.from(table.vehiclePhotos)
				.where(eq(table.vehiclePhotos.galleryId, id));
			const inGallery = new Set(existing.map((p) => p.id));

			await Promise.all(
				photoOrder
					.filter((photoId) => inGallery.has(photoId))
					.map((photoId, index) =>
						db
							.update(table.vehiclePhotos)
							.set({ order: index, updatedAt: new Date() })
							.where(eq(table.vehiclePhotos.id, photoId))
					)
			);
		}

		const [gallery] = await db
			.update(table.galleries)
			.set({ ...fields, updatedAt: new Date() })
			.where(eq(table.galleries.id, id))
			.returning();

		return json({ gallery });
	});

export const DELETE: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const id = context.params.id;
		if (!id) return notFound('Gallery not found');

		await ownedGallery(id, user.id);
		const db = getDb();

		// The FK cascade erases the photo rows, so their blob pathnames have to be
		// collected first or the files are orphaned in the store.
		const photos = await db
			.select({ imageUrl: table.vehiclePhotos.imageUrl })
			.from(table.vehiclePhotos)
			.where(eq(table.vehiclePhotos.galleryId, id));

		await db.delete(table.galleries).where(eq(table.galleries.id, id));
		await deleteManagedFiles(photos.map((p) => p.imageUrl));

		return noContent();
	});
