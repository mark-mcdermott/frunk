import type { APIRoute } from 'astro';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '../../../lib/server/db';
import * as table from '../../../lib/server/db/schema';
import { ownedVehicle, ownedVendor, requireSession } from '../_lib/guard';
import { handler, json, readJson } from '../_lib/http';
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
				vendorName: table.vendors.name,
				vehicleMake: table.vehicles.make,
				vehicleModel: table.vehicles.model,
				vehicleYear: table.vehicles.year
			})
			.from(table.repairs)
			.innerJoin(table.vehicles, eq(table.repairs.vehicleId, table.vehicles.id))
			.leftJoin(table.vendors, eq(table.repairs.vendorId, table.vendors.id))
			.where(eq(table.vehicles.userId, user.uuid))
			.orderBy(desc(table.repairs.date));

		return json({ repairs });
	});

export const POST: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const body = await readJson(context.request, createRepairSchema);

		await ownedVehicle(body.vehicleId, user.uuid);
		if (body.vendorId) await ownedVendor(body.vendorId, user.uuid);

		const [repair] = await getDb()
			.insert(table.repairs)
			.values({ ...body, id: crypto.randomUUID() })
			.returning();

		return json({ repair }, 201);
	});
