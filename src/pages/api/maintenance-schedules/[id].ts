import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb } from '../../../lib/server/db';
import * as table from '../../../lib/server/db/schema';
import { ownedSchedule, requireSession } from '../_lib/guard';
import { handler, json, noContent, notFound, readJson } from '../_lib/http';
import { updateScheduleSchema } from '../_lib/schemas';

export const prerender = false;

/**
 * Marking a schedule done is this PATCH with `lastCompletedDate` and
 * `lastCompletedMileage` — the SvelteKit app had a separate `completeSchedule`
 * action, but it only wrote those two columns.
 */
export const PATCH: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const id = context.params.id;
		if (!id) return notFound('Maintenance schedule not found');

		await ownedSchedule(id, user.id);
		const body = await readJson(context.request, updateScheduleSchema);

		const [schedule] = await getDb()
			.update(table.maintenanceSchedules)
			.set({ ...body, updatedAt: new Date() })
			.where(eq(table.maintenanceSchedules.id, id))
			.returning();

		return json({ schedule });
	});

export const DELETE: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const id = context.params.id;
		if (!id) return notFound('Maintenance schedule not found');

		await ownedSchedule(id, user.id);
		await getDb().delete(table.maintenanceSchedules).where(eq(table.maintenanceSchedules.id, id));

		return noContent();
	});
