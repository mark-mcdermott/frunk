import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb } from '../../../lib/server/db';
import * as table from '../../../lib/server/db/schema';
import { ownedPhoto, requireSession } from '../_lib/guard';
import { handler, json, noContent, notFound, readJson } from '../_lib/http';
import { updatePhotoSchema } from '../_lib/schemas';

export const prerender = false;

export const PATCH: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const id = context.params.id;
		if (!id) return notFound('Photo not found');

		await ownedPhoto(id, user.id);
		const body = await readJson(context.request, updatePhotoSchema);

		const [photo] = await getDb()
			.update(table.vehiclePhotos)
			.set({ ...body, updatedAt: new Date() })
			.where(eq(table.vehiclePhotos.id, id))
			.returning();

		return json({ photo });
	});

export const DELETE: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const id = context.params.id;
		if (!id) return notFound('Photo not found');

		await ownedPhoto(id, user.id);
		await getDb().delete(table.vehiclePhotos).where(eq(table.vehiclePhotos.id, id));

		return noContent();
	});
