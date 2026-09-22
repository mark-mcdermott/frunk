import { and, desc, eq } from 'drizzle-orm';
import { assess, summarize, type Assessment, type Summary } from '../maintenance';
import { getDb } from './db';
import * as table from './db/schema';

/**
 * How a schedule's "last done" is kept true.
 *
 * Two things write it. Marking a schedule done (`completeSchedule`) writes it
 * directly and, unless asked not to, logs the service as a repair that counts toward
 * the schedule. And any repair that counts toward a schedule keeps it in step
 * (`resyncSchedule`): a completed repair moves "last done" forward, and when the
 * repair that *was* the last completion is deleted, un-linked or marked not done, the
 * next latest takes its place. A manual completion is never moved backwards by an
 * older repair.
 *
 * Every change to "last done" clears `reminderSentAt`, so the digest speaks once per
 * due cycle — and again if a deleted repair makes a schedule due after all.
 */

interface LastDone {
	date: Date;
	mileage: number | null;
}

async function latestLinkedRepair(scheduleId: string): Promise<LastDone | null> {
	const [row] = await getDb()
		.select({ date: table.repairs.date, mileage: table.repairs.mileage })
		.from(table.repairs)
		.where(and(eq(table.repairs.scheduleId, scheduleId), eq(table.repairs.status, 'completed')))
		.orderBy(desc(table.repairs.date))
		.limit(1);
	return row ?? null;
}

/**
 * @param detached the completion date of a linked repair that no longer counts —
 * deleted, moved, un-linked or no longer completed. When that is the date the
 * schedule currently shows, "last done" is recomputed from what remains.
 */
export async function resyncSchedule(
	scheduleId: string,
	detached: { date: Date } | null = null
): Promise<void> {
	const db = getDb();
	const [schedule] = await db
		.select()
		.from(table.maintenanceSchedules)
		.where(eq(table.maintenanceSchedules.id, scheduleId));
	if (!schedule) return;

	const latest = await latestLinkedRepair(scheduleId);
	const current = schedule.lastCompletedDate;

	const advances =
		latest != null && (current == null || latest.date.getTime() >= current.getTime());
	const cameFromDetached =
		detached != null && current != null && current.getTime() === detached.date.getTime();

	if (!advances && !cameFromDetached) return;

	const unchanged =
		(latest?.date.getTime() ?? null) === (current?.getTime() ?? null) &&
		(latest?.mileage ?? null) === schedule.lastCompletedMileage;
	if (unchanged) return;

	await db
		.update(table.maintenanceSchedules)
		.set({
			lastCompletedDate: latest?.date ?? null,
			lastCompletedMileage: latest?.mileage ?? null,
			reminderSentAt: null,
			updatedAt: new Date()
		})
		.where(eq(table.maintenanceSchedules.id, scheduleId));
}

export interface Completion {
	date: Date;
	mileage: number | null;
	cost: number | null;
	vendorId: string | null;
	/** Log the service as a completed repair that counts toward the schedule. */
	logRepair: boolean;
}

export interface Completed {
	schedule: table.MaintenanceSchedule;
	repair: table.Repair | null;
	/** The vehicle's odometer after the completion, which may have moved it forward. */
	currentMileage: number | null;
}

/**
 * Marks a schedule done. A completion dated before the current "last done" is a
 * backfill: the repair is still logged, but the schedule keeps its later date. A
 * mileage higher than the vehicle's odometer reading updates the reading — the
 * number on the invoice is the freshest one there is.
 */
export async function completeSchedule(
	schedule: table.MaintenanceSchedule,
	vehicle: table.Vehicle,
	completion: Completion
): Promise<Completed> {
	const db = getDb();
	const now = new Date();

	let repair: table.Repair | null = null;
	if (completion.logRepair) {
		[repair = null] = await db
			.insert(table.repairs)
			.values({
				id: crypto.randomUUID(),
				vehicleId: vehicle.id,
				vendorId: completion.vendorId,
				description: schedule.name,
				date: completion.date,
				mileage: completion.mileage,
				cost: completion.cost,
				status: 'completed',
				scheduleId: schedule.id
			})
			.returning();
	}

	let updated = schedule;
	const backfill =
		schedule.lastCompletedDate != null &&
		completion.date.getTime() < schedule.lastCompletedDate.getTime();
	if (!backfill) {
		[updated = schedule] = await db
			.update(table.maintenanceSchedules)
			.set({
				lastCompletedDate: completion.date,
				lastCompletedMileage: completion.mileage,
				reminderSentAt: null,
				updatedAt: now
			})
			.where(eq(table.maintenanceSchedules.id, schedule.id))
			.returning();
	}

	let currentMileage = vehicle.currentMileage;
	if (
		completion.mileage != null &&
		(currentMileage == null || completion.mileage > currentMileage)
	) {
		await db
			.update(table.vehicles)
			.set({ currentMileage: completion.mileage, updatedAt: now })
			.where(eq(table.vehicles.id, vehicle.id));
		currentMileage = completion.mileage;
	}

	return { schedule: updated, repair, currentMileage };
}

/** Overdue and due-soon counts per vehicle, for the garage list's badges. */
export async function maintenanceSummaries(
	userId: string,
	now: Date = new Date()
): Promise<Map<string, Summary>> {
	const rows = await getDb()
		.select({ schedule: table.maintenanceSchedules, currentMileage: table.vehicles.currentMileage })
		.from(table.maintenanceSchedules)
		.innerJoin(table.vehicles, eq(table.maintenanceSchedules.vehicleId, table.vehicles.id))
		.where(eq(table.vehicles.userId, userId));

	const byVehicle = new Map<string, Assessment[]>();
	for (const { schedule, currentMileage } of rows) {
		const list = byVehicle.get(schedule.vehicleId) ?? [];
		list.push(assess(schedule, currentMileage, now));
		byVehicle.set(schedule.vehicleId, list);
	}

	return new Map([...byVehicle].map(([vehicleId, list]) => [vehicleId, summarize(list)]));
}
