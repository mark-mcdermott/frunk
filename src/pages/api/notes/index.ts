import type { APIRoute } from 'astro';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '../../../lib/server/db';
import * as table from '../../../lib/server/db/schema';
import { ownedNote, ownedRepair, ownedVehicle, ownedVendor, requireSession } from '../_lib/guard';
import { handler, json, readJson } from '../_lib/http';
import { createNoteSchema } from '../_lib/schemas';

export const prerender = false;

/** Every note attached to one of the user's vehicles, newest first. */
export const GET: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);

		const notes = await getDb()
			.select({
				note: table.notes,
				vehicleMake: table.vehicles.make,
				vehicleModel: table.vehicles.model,
				vehicleYear: table.vehicles.year
			})
			.from(table.notes)
			.innerJoin(table.vehicles, eq(table.notes.vehicleId, table.vehicles.id))
			.where(eq(table.vehicles.userId, user.uuid))
			.orderBy(desc(table.notes.createdAt));

		return json({
			notes: notes.map(({ note, ...vehicle }) => ({ ...note, vehicle }))
		});
	});

export const POST: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const body = await readJson(context.request, createNoteSchema);

		// A note is only creatable against a parent the caller owns.
		if (body.vehicleId) await ownedVehicle(body.vehicleId, user.uuid);
		if (body.repairId) await ownedRepair(body.repairId, user.uuid);
		if (body.vendorId) await ownedVendor(body.vendorId, user.uuid);
		if (body.parentNoteId) await ownedNote(body.parentNoteId, user.uuid);

		const [note] = await getDb()
			.insert(table.notes)
			.values({ ...body, uuid: crypto.randomUUID(), userId: user.uuid })
			.returning();

		return json({ note }, 201);
	});
