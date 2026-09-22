import type { APIRoute } from 'astro';
import { desc, eq, inArray } from 'drizzle-orm';
import { getDb } from '../../../lib/server/db';
import * as table from '../../../lib/server/db/schema';
import { deleteManagedFiles } from '../../../lib/server/files';
import { ownedVehicle, requireSession } from '../_lib/guard';
import { handler, json, noContent, notFound, readJson } from '../_lib/http';
import { updateVehicleSchema } from '../_lib/schemas';

export const prerender = false;

/**
 * The vehicle detail screen in one request.
 *
 * The SvelteKit load function issued six queries plus one per gallery; the photo
 * fetch here is a single `inArray` grouped in memory. (Its `allPhotos` block was
 * dead code carrying a "Will be replaced with inArray" comment and an `eq` against
 * only the first gallery — the real work happened in a `Promise.all` N+1 below it.)
 */
export const GET: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const id = context.params.id;
		if (!id) return notFound('Vehicle not found');

		const vehicle = await ownedVehicle(id, user.id);
		const db = getDb();

		const [notes, repairs, vendors, galleryRows, schedules] = await Promise.all([
			db
				.select()
				.from(table.notes)
				.where(eq(table.notes.vehicleId, id))
				.orderBy(desc(table.notes.createdAt)),
			db
				.select({
					id: table.repairs.id,
					description: table.repairs.description,
					date: table.repairs.date,
					mileage: table.repairs.mileage,
					cost: table.repairs.cost,
					status: table.repairs.status,
					vendorId: table.repairs.vendorId,
					scheduleId: table.repairs.scheduleId,
					vendorName: table.vendors.name
				})
				.from(table.repairs)
				.leftJoin(table.vendors, eq(table.repairs.vendorId, table.vendors.id))
				.where(eq(table.repairs.vehicleId, id))
				.orderBy(desc(table.repairs.date)),
			db
				.select()
				.from(table.vendors)
				.where(eq(table.vendors.userId, user.id))
				.orderBy(table.vendors.name),
			db
				.select()
				.from(table.galleries)
				.where(eq(table.galleries.vehicleId, id))
				.orderBy(table.galleries.order, desc(table.galleries.createdAt)),
			db
				.select()
				.from(table.maintenanceSchedules)
				.where(eq(table.maintenanceSchedules.vehicleId, id))
				.orderBy(table.maintenanceSchedules.name)
		]);

		const galleryIds = galleryRows.map((g) => g.id);
		const photos = galleryIds.length
			? await db
					.select()
					.from(table.vehiclePhotos)
					.where(inArray(table.vehiclePhotos.galleryId, galleryIds))
					.orderBy(table.vehiclePhotos.order, desc(table.vehiclePhotos.createdAt))
			: [];

		const photosByGallery = new Map<string, typeof photos>();
		for (const photo of photos) {
			const bucket = photosByGallery.get(photo.galleryId);
			if (bucket) bucket.push(photo);
			else photosByGallery.set(photo.galleryId, [photo]);
		}

		const galleries = galleryRows.map((gallery) => ({
			...gallery,
			photos: photosByGallery.get(gallery.id) ?? []
		}));

		return json({ vehicle, notes, repairs, vendors, galleries, schedules });
	});

export const PATCH: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const id = context.params.id;
		if (!id) return notFound('Vehicle not found');

		const before = await ownedVehicle(id, user.id);
		const body = await readJson(context.request, updateVehicleSchema);

		const [vehicle] = await getDb()
			.update(table.vehicles)
			.set({ ...body, updatedAt: new Date() })
			.where(eq(table.vehicles.id, id))
			.returning();

		// A replaced or cleared cover image leaves its old blob unreachable — the URL
		// existed only in this column. PATCH semantics: an omitted `image` keeps it.
		if ('image' in body && body.image !== before.image) {
			await deleteManagedFiles([before.image]);
		}

		return json({ vehicle });
	});

export const DELETE: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const id = context.params.id;
		if (!id) return notFound('Vehicle not found');

		const vehicle = await ownedVehicle(id, user.id);
		const db = getDb();

		/*
		 * Notes, repairs, galleries and schedules cascade from the FK — which erases
		 * every row naming a blob, so the pathnames are collected first: the cover
		 * image, every gallery photo, every note attachment.
		 */
		const [photos, vehicleNotes] = await Promise.all([
			db
				.select({ imageUrl: table.vehiclePhotos.imageUrl })
				.from(table.vehiclePhotos)
				.innerJoin(table.galleries, eq(table.vehiclePhotos.galleryId, table.galleries.id))
				.where(eq(table.galleries.vehicleId, id)),
			db
				.select({ imageUrl: table.notes.imageUrl })
				.from(table.notes)
				.where(eq(table.notes.vehicleId, id))
		]);

		await db.delete(table.vehicles).where(eq(table.vehicles.id, id));
		await deleteManagedFiles([
			vehicle.image,
			...photos.map((p) => p.imageUrl),
			...vehicleNotes.map((n) => n.imageUrl)
		]);

		return noContent();
	});
