import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb } from '../../../lib/server/db';
import * as table from '../../../lib/server/db/schema';
import { resyncSchedule } from '../../../lib/server/maintenance';
import { ownedRepair, ownedVendor, requireSession } from '../_lib/guard';
import { handler, json, noContent, notFound, readJson } from '../_lib/http';
import { updateRepairSchema } from '../_lib/schemas';
import { scheduleOn } from './index';

export const prerender = false;

export const GET: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const id = context.params.id;
		if (!id) return notFound('Repair not found');

		const repair = await ownedRepair(id, user.id);
		const notes = await getDb().select().from(table.notes).where(eq(table.notes.repairId, id));

		return json({ repair, notes });
	});

export const PATCH: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const id = context.params.id;
		if (!id) return notFound('Repair not found');

		const before = await ownedRepair(id, user.id);
		const body = await readJson(context.request, updateRepairSchema);

		// Reassigning to a vendor only works if that vendor is also the caller's.
		if (body.vendorId) await ownedVendor(body.vendorId, user.id);
		if (body.scheduleId) await scheduleOn(before.vehicleId, body.scheduleId, user.id);

		const [repair] = await getDb()
			.update(table.repairs)
			.set({ ...body, updatedAt: new Date() })
			.where(eq(table.repairs.id, id))
			.returning();

		/*
		 * Whatever this repair contributed before — its date, on its old schedule — may
		 * no longer count; whatever it contributes now may move a schedule forward.
		 * `resyncSchedule` sorts out both from the repairs that remain linked.
		 */
		const was = before.status === 'completed' ? { date: before.date } : null;
		if (before.scheduleId && before.scheduleId !== repair?.scheduleId) {
			await resyncSchedule(before.scheduleId, was);
		}
		if (repair?.scheduleId) {
			await resyncSchedule(repair.scheduleId, before.scheduleId === repair.scheduleId ? was : null);
		}

		return json({ repair });
	});

export const DELETE: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const id = context.params.id;
		if (!id) return notFound('Repair not found');

		const repair = await ownedRepair(id, user.id);
		await getDb().delete(table.repairs).where(eq(table.repairs.id, id));

		if (repair.scheduleId) {
			await resyncSchedule(
				repair.scheduleId,
				repair.status === 'completed' ? { date: repair.date } : null
			);
		}

		return noContent();
	});
