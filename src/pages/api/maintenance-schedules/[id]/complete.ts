import type { APIRoute } from 'astro';
import { completeSchedule } from '../../../../lib/server/maintenance';
import { ownedSchedule, ownedVehicle, ownedVendor, requireSession } from '../../_lib/guard';
import { handler, json, notFound, readJson } from '../../_lib/http';
import { completeScheduleSchema } from '../../_lib/schemas';

export const prerender = false;

/**
 * Marks a schedule done, in one request: "last done" moves to the given date and
 * mileage, the vehicle's odometer reading moves forward if the mileage is higher, and
 * unless `logRepair` is false the service is logged as a completed repair that counts
 * toward the schedule. Answers `{ schedule, repair, currentMileage }`.
 */
export const POST: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const id = context.params.id;
		if (!id) return notFound('Maintenance schedule not found');

		const schedule = await ownedSchedule(id, user.id);
		const body = await readJson(context.request, completeScheduleSchema);
		if (body.vendorId) await ownedVendor(body.vendorId, user.id);
		const vehicle = await ownedVehicle(schedule.vehicleId, user.id);

		const result = await completeSchedule(schedule, vehicle, {
			date: body.date,
			mileage: body.mileage ?? null,
			cost: body.cost ?? null,
			vendorId: body.vendorId ?? null,
			logRepair: body.logRepair
		});

		return json(result);
	});
