import type { APIRoute } from 'astro';
import { getDb } from '../../../../lib/server/db';
import * as table from '../../../../lib/server/db/schema';
import { FILES_ROUTE } from '../../../../lib/server/files';
import { ownedRepair, requireSession } from '../../_lib/guard';
import { fail, handler, json, notFound, readJson } from '../../_lib/http';
import { createAttachmentSchema } from '../../_lib/schemas';

export const prerender = false;

/**
 * Hangs an uploaded file on a repair. Two requests, like a gallery photo: the upload
 * answers with a serving URL, and this writes the row. The URL has to sit under the
 * caller's own prefix — the serving route would refuse a foreign one anyway, but a
 * row pointing at a file its owner can never open is a bug, not a feature.
 */
export const POST: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const id = context.params.id;
		if (!id) return notFound('Repair not found');

		await ownedRepair(id, user.id);
		const body = await readJson(context.request, createAttachmentSchema);

		if (!body.url.startsWith(`${FILES_ROUTE}u/${user.id}/`)) {
			return fail(400, 'That file is not one of your uploads');
		}

		const [attachment] = await getDb()
			.insert(table.repairAttachments)
			.values({ ...body, id: crypto.randomUUID(), repairId: id })
			.returning();

		return json({ attachment }, 201);
	});
