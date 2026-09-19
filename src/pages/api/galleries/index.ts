import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/server/db';
import * as table from '../../../lib/server/db/schema';
import { ownedVehicle, requireSession } from '../_lib/guard';
import { handler, json, readJson } from '../_lib/http';
import { createGallerySchema } from '../_lib/schemas';

export const prerender = false;

export const POST: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const body = await readJson(context.request, createGallerySchema);

		await ownedVehicle(body.vehicleId, user.id);

		const [gallery] = await getDb()
			.insert(table.galleries)
			.values({ ...body, id: crypto.randomUUID() })
			.returning();

		return json({ gallery }, 201);
	});
