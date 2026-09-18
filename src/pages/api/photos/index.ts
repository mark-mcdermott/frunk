import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/server/db';
import * as table from '../../../lib/server/db/schema';
import { ownedGallery, requireSession } from '../_lib/guard';
import { handler, json, readJson } from '../_lib/http';
import { createPhotoSchema } from '../_lib/schemas';

export const prerender = false;

/**
 * Takes an `imageUrl` that already exists. Phase 4 adds the upload half — a
 * Vercel Blob write, `access: 'private'` for documents — and this endpoint records
 * the result. It deliberately does not accept the base64 `fileData` the SvelteKit
 * actions took.
 */
export const POST: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const body = await readJson(context.request, createPhotoSchema);

		await ownedGallery(body.galleryId, user.uuid);

		const [photo] = await getDb()
			.insert(table.vehiclePhotos)
			.values({ ...body, id: crypto.randomUUID() })
			.returning();

		return json({ photo }, 201);
	});
