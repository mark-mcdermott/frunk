import type { APIContext } from 'astro';
import { and, eq } from 'drizzle-orm';
import { isAdmin } from '../../../lib/roles';
import { getDb } from '../../../lib/server/db';
import * as table from '../../../lib/server/db/schema';
import { forbidden, HttpError, notFound, unauthorized } from './http';
import { resolveSession, type ResolvedSession } from './session';

/**
 * The two things every handler does before touching data: establish who is asking,
 * and establish that the row they named is theirs.
 *
 * Ownership is checked with a `userId` predicate in the query rather than by
 * fetching and comparing afterwards, so a row belonging to someone else is
 * indistinguishable from one that does not exist — no existence oracle.
 */

export async function requireSession(context: APIContext): Promise<ResolvedSession> {
	const session = await resolveSession(context);
	if (!session) throw new HttpError(unauthorized());
	return session;
}

export async function requireAdmin(context: APIContext): Promise<ResolvedSession> {
	const session = await requireSession(context);
	if (!isAdmin(session.user.roles)) throw new HttpError(forbidden());
	return session;
}

export async function ownedVehicle(vehicleId: string, userId: string) {
	const [vehicle] = await getDb()
		.select()
		.from(table.vehicles)
		.where(and(eq(table.vehicles.id, vehicleId), eq(table.vehicles.userId, userId)));

	if (!vehicle) throw new HttpError(notFound('Vehicle not found'));
	return vehicle;
}

export async function ownedVendor(vendorId: string, userId: string) {
	const [vendor] = await getDb()
		.select()
		.from(table.vendors)
		.where(and(eq(table.vendors.id, vendorId), eq(table.vendors.userId, userId)));

	if (!vendor) throw new HttpError(notFound('Vendor not found'));
	return vendor;
}

/** Repairs hang off a vehicle, so ownership is the join, not a column. */
export async function ownedRepair(repairId: string, userId: string) {
	const [row] = await getDb()
		.select({ repair: table.repairs })
		.from(table.repairs)
		.innerJoin(table.vehicles, eq(table.repairs.vehicleId, table.vehicles.id))
		.where(and(eq(table.repairs.id, repairId), eq(table.vehicles.userId, userId)));

	if (!row) throw new HttpError(notFound('Repair not found'));
	return row.repair;
}

export async function ownedGallery(galleryId: string, userId: string) {
	const [row] = await getDb()
		.select({ gallery: table.galleries })
		.from(table.galleries)
		.innerJoin(table.vehicles, eq(table.galleries.vehicleId, table.vehicles.id))
		.where(and(eq(table.galleries.id, galleryId), eq(table.vehicles.userId, userId)));

	if (!row) throw new HttpError(notFound('Gallery not found'));
	return row.gallery;
}

export async function ownedPhoto(photoId: string, userId: string) {
	const [row] = await getDb()
		.select({ photo: table.vehiclePhotos })
		.from(table.vehiclePhotos)
		.innerJoin(table.galleries, eq(table.vehiclePhotos.galleryId, table.galleries.id))
		.innerJoin(table.vehicles, eq(table.galleries.vehicleId, table.vehicles.id))
		.where(and(eq(table.vehiclePhotos.id, photoId), eq(table.vehicles.userId, userId)));

	if (!row) throw new HttpError(notFound('Photo not found'));
	return row.photo;
}

export async function ownedSchedule(scheduleId: string, userId: string) {
	const [row] = await getDb()
		.select({ schedule: table.maintenanceSchedules })
		.from(table.maintenanceSchedules)
		.innerJoin(table.vehicles, eq(table.maintenanceSchedules.vehicleId, table.vehicles.id))
		.where(
			and(eq(table.maintenanceSchedules.id, scheduleId), eq(table.vehicles.userId, userId))
		);

	if (!row) throw new HttpError(notFound('Maintenance schedule not found'));
	return row.schedule;
}

/**
 * Notes attach to a vehicle, repair, vendor or user, so ownership is checked
 * against whichever parent the note actually carries.
 */
export async function ownedNote(noteUuid: string, userId: string) {
	const [note] = await getDb().select().from(table.notes).where(eq(table.notes.uuid, noteUuid));
	if (!note) throw new HttpError(notFound('Note not found'));

	if (note.userId && note.userId === userId) return note;
	if (note.vehicleId) {
		await ownedVehicle(note.vehicleId, userId);
		return note;
	}
	if (note.repairId) {
		await ownedRepair(note.repairId, userId);
		return note;
	}
	if (note.vendorId) {
		await ownedVendor(note.vendorId, userId);
		return note;
	}

	throw new HttpError(notFound('Note not found'));
}
