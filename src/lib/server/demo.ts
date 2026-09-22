import { eq, inArray } from 'drizzle-orm';
import { ROLE_IDS } from '../roles';
import { getDb } from './db';
import * as table from './db/schema';

/**
 * Anonymous demo accounts (Decision 5).
 *
 * A demo visitor is not in a mode — they are in a real, disposable account with a
 * `DEMO` role, cloned from a template user. Nothing downstream needs to know: rows are
 * isolated by `user_id` exactly as they are between any two real people, which is why
 * there is no `demo` flag anywhere in the API and no duplicate route tree.
 *
 * It is also what makes conversion free. Attaching a passkey to the account someone is
 * already using turns it into a real one in place, with everything they made during
 * the trial still theirs — see `api/auth/register/options.ts`.
 */

const TEMPLATE_EMAIL = 'creed.bratton@dundermifflin.com';

/** The seed has not been run — `scripts/seed-office.ts` creates the template. */
export class DemoTemplateMissing extends Error {
	constructor() {
		super(`No demo template user (${TEMPLATE_EMAIL}). Run pnpm db:seed-office.`);
	}
}

/**
 * Every clone is the same move: keep the row's content, take a new identity, and
 * re-point whatever it referenced at the copy. Spreading the rest of the columns rather
 * than listing them means a column added to `vehicles` — there are 46 optional ones
 * already — is carried across without anyone remembering to come back here.
 */
function reidentify<T extends { id: unknown }>(row: T, id: string, now: Date) {
	const {
		id: _old,
		createdAt: _created,
		updatedAt: _updated,
		...rest
	} = row as T & {
		createdAt?: Date;
		updatedAt?: Date;
	};
	return { ...rest, id, createdAt: now, updatedAt: now };
}

const remap = (map: Map<string, string>, id: string | null) => (id ? (map.get(id) ?? null) : null);

/**
 * Clones the template garage into an account that already exists.
 *
 * Better Auth's `anonymous` plugin creates the user and the session (Decision 5), so
 * this no longer mints either — it only copies the sample data in. Splitting it that
 * way is what makes "upgrade in place" fall out for free: attaching a credential to an
 * anonymous account converts it without touching anything cloned here.
 */
export async function cloneDemoAccount(userId: string): Promise<string> {
	const db = getDb();
	const now = new Date();

	const [template] = await db.select().from(table.user).where(eq(table.user.email, TEMPLATE_EMAIL));

	if (!template) throw new DemoTemplateMissing();

	/*
	 * The account already exists — Better Auth's anonymous plugin created it along with
	 * the session. `roles` is what the app gates on (Decision 5); `isAnonymous` is the
	 * plugin's own bookkeeping, and the two must not be allowed to disagree.
	 */
	await db
		.update(table.user)
		.set({ roles: [ROLE_IDS.DEMO], age: template.age, image: template.image })
		.where(eq(table.user.id, userId));

	const [templateVendors, templateVehicles] = await Promise.all([
		db.select().from(table.vendors).where(eq(table.vendors.userId, template.id)),
		db.select().from(table.vehicles).where(eq(table.vehicles.userId, template.id))
	]);

	const vendorIds = new Map(templateVendors.map((v) => [v.id, crypto.randomUUID()]));
	const vehicleIds = new Map(templateVehicles.map((v) => [v.id, crypto.randomUUID()]));

	if (templateVendors.length) {
		await db.insert(table.vendors).values(
			templateVendors.map((vendor) => ({
				...reidentify(vendor, vendorIds.get(vendor.id)!, now),
				userId
			}))
		);
	}

	if (templateVehicles.length) {
		await db.insert(table.vehicles).values(
			templateVehicles.map((vehicle) => ({
				...reidentify(vehicle, vehicleIds.get(vehicle.id)!, now),
				userId
			}))
		);
	}

	const sourceVehicleIds = [...vehicleIds.keys()];
	const [templateRepairs, templateGalleries, templateSchedules, vehicleNotes] =
		sourceVehicleIds.length
			? await Promise.all([
					db.select().from(table.repairs).where(inArray(table.repairs.vehicleId, sourceVehicleIds)),
					db
						.select()
						.from(table.galleries)
						.where(inArray(table.galleries.vehicleId, sourceVehicleIds)),
					db
						.select()
						.from(table.maintenanceSchedules)
						.where(inArray(table.maintenanceSchedules.vehicleId, sourceVehicleIds)),
					db.select().from(table.notes).where(inArray(table.notes.vehicleId, sourceVehicleIds))
				])
			: [[], [], [], []];

	const repairIds = new Map(templateRepairs.map((r) => [r.id, crypto.randomUUID()]));
	const galleryIds = new Map(templateGalleries.map((g) => [g.id, crypto.randomUUID()]));
	const scheduleIds = new Map(templateSchedules.map((s) => [s.id, crypto.randomUUID()]));

	// Schedules go before repairs: a repair may count toward one (`scheduleId`).
	if (templateSchedules.length) {
		await db.insert(table.maintenanceSchedules).values(
			templateSchedules.map((schedule) => ({
				...reidentify(schedule, scheduleIds.get(schedule.id)!, now),
				vehicleId: vehicleIds.get(schedule.vehicleId)!,
				// A clone has never been mailed about, whatever the template was.
				reminderSentAt: null
			}))
		);
	}

	if (templateRepairs.length) {
		await db.insert(table.repairs).values(
			templateRepairs.map((repair) => ({
				...reidentify(repair, repairIds.get(repair.id)!, now),
				vehicleId: vehicleIds.get(repair.vehicleId)!,
				vendorId: remap(vendorIds, repair.vendorId),
				scheduleId: remap(scheduleIds, repair.scheduleId)
			}))
		);
	}

	if (templateGalleries.length) {
		await db.insert(table.galleries).values(
			templateGalleries.map((gallery) => ({
				...reidentify(gallery, galleryIds.get(gallery.id)!, now),
				vehicleId: vehicleIds.get(gallery.vehicleId)!
			}))
		);
	}

	const sourceGalleryIds = [...galleryIds.keys()];
	if (sourceGalleryIds.length) {
		const templatePhotos = await db
			.select()
			.from(table.vehiclePhotos)
			.where(inArray(table.vehiclePhotos.galleryId, sourceGalleryIds));

		if (templatePhotos.length) {
			await db.insert(table.vehiclePhotos).values(
				templatePhotos.map((photo) => ({
					...reidentify(photo, crypto.randomUUID(), now),
					galleryId: galleryIds.get(photo.galleryId)!
				}))
			);
		}
	}

	// Notes hang off vehicles, repairs, vendors or the user directly, so they go last —
	// every id they point at has to exist by now.
	const userNotes = await db.select().from(table.notes).where(eq(table.notes.userId, template.id));
	const seen = new Set(vehicleNotes.map((note) => note.uuid));
	const templateNotes = [...vehicleNotes, ...userNotes.filter((note) => !seen.has(note.uuid))];

	if (templateNotes.length) {
		const noteIds = new Map(templateNotes.map((note) => [note.uuid, crypto.randomUUID()]));

		await db.insert(table.notes).values(
			templateNotes.map((note) => {
				// `id` is a serial and `uuid` is the identity notes are referenced by, so
				// this one re-keys on uuid rather than through `reidentify`.
				const { id: _id, uuid: _uuid, createdAt: _c, updatedAt: _u, ...rest } = note;
				return {
					...rest,
					uuid: noteIds.get(note.uuid)!,
					parentNoteId: remap(noteIds, note.parentNoteId),
					userId: note.userId === template.id ? userId : null,
					vehicleId: remap(vehicleIds, note.vehicleId),
					repairId: remap(repairIds, note.repairId),
					vendorId: remap(vendorIds, note.vendorId),
					createdAt: now,
					updatedAt: now
				};
			})
		);
	}

	return userId;
}
