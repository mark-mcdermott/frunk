import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb } from '../../../lib/server/db';
import * as table from '../../../lib/server/db/schema';
import { ownedRepair, ownedVendor, requireSession } from '../_lib/guard';
import { handler, json, noContent, notFound, readJson } from '../_lib/http';
import { updateRepairSchema } from '../_lib/schemas';

export const prerender = false;

export const GET: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const id = context.params.id;
		if (!id) return notFound('Repair not found');

		const repair = await ownedRepair(id, user.uuid);
		const notes = await getDb().select().from(table.notes).where(eq(table.notes.repairId, id));

		return json({ repair, notes });
	});

export const PATCH: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const id = context.params.id;
		if (!id) return notFound('Repair not found');

		await ownedRepair(id, user.uuid);
		const body = await readJson(context.request, updateRepairSchema);

		// Reassigning to a vendor only works if that vendor is also the caller's.
		if (body.vendorId) await ownedVendor(body.vendorId, user.uuid);

		const [repair] = await getDb()
			.update(table.repairs)
			.set({ ...body, updatedAt: new Date() })
			.where(eq(table.repairs.id, id))
			.returning();

		return json({ repair });
	});

export const DELETE: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const id = context.params.id;
		if (!id) return notFound('Repair not found');

		await ownedRepair(id, user.uuid);
		await getDb().delete(table.repairs).where(eq(table.repairs.id, id));

		return noContent();
	});
