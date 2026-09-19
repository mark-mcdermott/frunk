import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb } from '../../../lib/server/db';
import * as table from '../../../lib/server/db/schema';
import { ownedVendor, requireSession } from '../_lib/guard';
import { handler, json, noContent, notFound, readJson } from '../_lib/http';
import { updateVendorSchema } from '../_lib/schemas';

export const prerender = false;

export const GET: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const id = context.params.id;
		if (!id) return notFound('Vendor not found');

		const vendor = await ownedVendor(id, user.id);

		const [notes, repairs] = await Promise.all([
			getDb().select().from(table.notes).where(eq(table.notes.vendorId, id)),
			getDb().select().from(table.repairs).where(eq(table.repairs.vendorId, id))
		]);

		return json({ vendor, notes, repairs });
	});

export const PATCH: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const id = context.params.id;
		if (!id) return notFound('Vendor not found');

		await ownedVendor(id, user.id);
		const body = await readJson(context.request, updateVendorSchema);

		const [vendor] = await getDb()
			.update(table.vendors)
			.set({ ...body, updatedAt: new Date() })
			.where(eq(table.vendors.id, id))
			.returning();

		return json({ vendor });
	});

export const DELETE: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const id = context.params.id;
		if (!id) return notFound('Vendor not found');

		await ownedVendor(id, user.id);
		// Repairs keep their history: `vendor_id` is ON DELETE SET NULL.
		await getDb().delete(table.vendors).where(eq(table.vendors.id, id));

		return noContent();
	});
