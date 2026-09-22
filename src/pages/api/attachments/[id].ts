import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb } from '../../../lib/server/db';
import * as table from '../../../lib/server/db/schema';
import { deleteManagedFiles } from '../../../lib/server/files';
import { ownedAttachment, requireSession } from '../_lib/guard';
import { handler, noContent, notFound } from '../_lib/http';

export const prerender = false;

/** Removes a receipt from its repair, row then blob — the same order as a photo. */
export const DELETE: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const id = context.params.id;
		if (!id) return notFound('Attachment not found');

		const attachment = await ownedAttachment(id, user.id);
		await getDb().delete(table.repairAttachments).where(eq(table.repairAttachments.id, id));
		await deleteManagedFiles([attachment.url]);

		return noContent();
	});
