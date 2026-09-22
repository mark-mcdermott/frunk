import type { APIRoute } from 'astro';
import { desc, eq, sql } from 'drizzle-orm';
import { getDb } from '../../../lib/server/db';
import * as table from '../../../lib/server/db/schema';
import { resyncSchedule } from '../../../lib/server/maintenance';
import { ownedSchedule, ownedVehicle, ownedVendor, requireSession } from '../_lib/guard';
import { fail, handler, HttpError, json, readJson } from '../_lib/http';
import { createRepairSchema } from '../_lib/schemas';

export const prerender = false;

/**
 * Every repair across the user's vehicles. Scoped by joining to `vehicles` on the
 * owner rather than by first fetching the user's vehicle ids and passing them back
 * in — one query instead of two, and no id list to get out of step.
 */
export const GET: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);

		const repairs = await getDb()
			.select({
				id: table.repairs.id,
				vehicleId: table.repairs.vehicleId,
				vendorId: table.repairs.vendorId,
				description: table.repairs.description,
				date: table.repairs.date,
				mileage: table.repairs.mileage,
				cost: table.repairs.cost,
				status: table.repairs.status,
				scheduleId: table.repairs.scheduleId,
				vendorName: table.vendors.name,
				attachmentCount:
					sql<number>`(select count(*) from ${table.repairAttachments} where ${table.repairAttachments.repairId} = ${table.repairs.id})`.mapWith(
						Number
					),
				vehicleMake: table.vehicles.make,
				vehicleModel: table.vehicles.model,
				vehicleYear: table.vehicles.year
			})
			.from(table.repairs)
			.innerJoin(table.vehicles, eq(table.repairs.vehicleId, table.vehicles.id))
			.leftJoin(table.vendors, eq(table.repairs.vendorId, table.vendors.id))
			.where(eq(table.vehicles.userId, user.id))
			.orderBy(desc(table.repairs.date));

		return json({ repairs });
	});

export const POST: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const body = await readJson(context.request, createRepairSchema);

		await ownedVehicle(body.vehicleId, user.id);
		if (body.vendorId) await ownedVendor(body.vendorId, user.id);
		if (body.scheduleId) await scheduleOn(body.vehicleId, body.scheduleId, user.id);

		const [repair] = await getDb()
			.insert(table.repairs)
			.values({ ...body, id: crypto.randomUUID() })
			.returning();

		// A completed repair that counts toward a schedule is that schedule's "last done".
		if (repair?.scheduleId) await resyncSchedule(repair.scheduleId);

		return json({ repair }, 201);
	});

/**
 * A repair counts toward a schedule only on its own vehicle. The schedule must also
 * be the caller's, which `ownedSchedule` answers with a 404 like any foreign row.
 */
export async function scheduleOn(vehicleId: string, scheduleId: string, userId: string) {
	const schedule = await ownedSchedule(scheduleId, userId);
	if (schedule.vehicleId !== vehicleId) {
		throw new HttpError(fail(400, 'That schedule belongs to another vehicle'));
	}
	return schedule;
}
