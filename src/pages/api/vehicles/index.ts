import type { APIRoute } from 'astro';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '../../../lib/server/db';
import * as table from '../../../lib/server/db/schema';
import { maintenanceSummaries } from '../../../lib/server/maintenance';
import { requireSession } from '../_lib/guard';
import { handler, json, readJson } from '../_lib/http';
import { createVehicleSchema } from '../_lib/schemas';

export const prerender = false;

export const GET: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);

		const rows = await getDb()
			.select()
			.from(table.vehicles)
			.where(eq(table.vehicles.userId, user.id))
			.orderBy(desc(table.vehicles.createdAt));

		// Each row carries its due counts — schedules and renewal dates — so the garage
		// can badge a car without fetching every schedule behind it.
		const summaries = await maintenanceSummaries(rows);
		const vehicles = rows.map((vehicle) => ({
			...vehicle,
			maintenance: summaries.get(vehicle.id) ?? { overdue: 0, dueSoon: 0 }
		}));

		return json({ vehicles });
	});

export const POST: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const body = await readJson(context.request, createVehicleSchema);

		const id = crypto.randomUUID();
		const [vehicle] = await getDb()
			.insert(table.vehicles)
			.values({ ...body, id, userId: user.id })
			.returning();

		return json({ vehicle }, 201);
	});
