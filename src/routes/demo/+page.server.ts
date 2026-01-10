import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import * as auth from '$lib/server/auth';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/password';
import { ROLE_IDS } from '$lib/roles';
import type { Actions, PageServerLoad } from './$types';

const DEMO_TEMPLATE_USERNAME = 'creed.bratton@dundermifflin.com';

export const load: PageServerLoad = async (event) => {
	// If already logged in as demo user, redirect to demo vehicles
	if (event.locals.user) {
		const userRoles = event.locals.user.roles || [];
		if (userRoles.includes(ROLE_IDS.DEMO)) {
			return redirect(302, '/demo/vehicles');
		}
		return redirect(302, '/vehicles');
	}
	return {};
};

export const actions: Actions = {
	default: async (event) => {
		// Find the demo template user (Creed)
		const [templateUser] = await db
			.select()
			.from(table.user)
			.where(eq(table.user.username, DEMO_TEMPLATE_USERNAME));

		if (!templateUser) {
			// If no template user exists, just redirect to sign-in
			return redirect(302, '/sign-in');
		}

		// Create a new temporary demo user
		const demoUuid = crypto.randomUUID();
		const demoUsername = `demo-${demoUuid.slice(0, 8)}@frunk.app`;
		const demoPassword = await hashPassword(crypto.randomUUID()); // Random password they can't use

		await db.insert(table.user).values({
			uuid: demoUuid,
			username: demoUsername,
			age: templateUser.age,
			passwordHash: demoPassword,
			roles: [ROLE_IDS.DEMO],
			avatar: templateUser.avatar,
			emailVerified: 1
		});

		// Copy all of Creed's data to the new demo user
		// We need to maintain ID mappings for relationships

		// 1. Copy vendors
		const templateVendors = await db
			.select()
			.from(table.vendors)
			.where(eq(table.vendors.userId, templateUser.uuid));

		const vendorIdMap = new Map<string, string>();
		for (const vendor of templateVendors) {
			const newVendorId = crypto.randomUUID();
			vendorIdMap.set(vendor.id, newVendorId);
			await db.insert(table.vendors).values({
				id: newVendorId,
				userId: demoUuid,
				name: vendor.name,
				address: vendor.address,
				phone: vendor.phone,
				website: vendor.website
			});
		}

		// 2. Copy vehicles
		const templateVehicles = await db
			.select()
			.from(table.vehicles)
			.where(eq(table.vehicles.userId, templateUser.uuid));

		const vehicleIdMap = new Map<string, string>();
		for (const vehicle of templateVehicles) {
			const newVehicleId = crypto.randomUUID();
			vehicleIdMap.set(vehicle.id, newVehicleId);
			await db.insert(table.vehicles).values({
				id: newVehicleId,
				userId: demoUuid,
				make: vehicle.make,
				model: vehicle.model,
				year: vehicle.year,
				vin: vehicle.vin,
				image: vehicle.image
			});
		}

		// 3. Copy repairs (need vehicle and vendor mappings)
		const repairIdMap = new Map<string, string>();
		for (const [oldVehicleId, newVehicleId] of vehicleIdMap) {
			const templateRepairs = await db
				.select()
				.from(table.repairs)
				.where(eq(table.repairs.vehicleId, oldVehicleId));

			for (const repair of templateRepairs) {
				const newRepairId = crypto.randomUUID();
				repairIdMap.set(repair.id, newRepairId);
				await db.insert(table.repairs).values({
					id: newRepairId,
					vehicleId: newVehicleId,
					vendorId: repair.vendorId ? vendorIdMap.get(repair.vendorId) || null : null,
					description: repair.description,
					date: repair.date,
					mileage: repair.mileage,
					cost: repair.cost,
					status: repair.status
				});
			}
		}

		// 4. Copy galleries (linked to vehicles)
		const galleryIdMap = new Map<string, string>();
		for (const [oldVehicleId, newVehicleId] of vehicleIdMap) {
			const templateGalleries = await db
				.select()
				.from(table.galleries)
				.where(eq(table.galleries.vehicleId, oldVehicleId));

			for (const gallery of templateGalleries) {
				const newGalleryId = crypto.randomUUID();
				galleryIdMap.set(gallery.id, newGalleryId);
				await db.insert(table.galleries).values({
					id: newGalleryId,
					vehicleId: newVehicleId,
					name: gallery.name,
					description: gallery.description,
					order: gallery.order
				});
			}
		}

		// 5. Copy vehicle photos (linked to galleries)
		for (const [oldGalleryId, newGalleryId] of galleryIdMap) {
			const templatePhotos = await db
				.select()
				.from(table.vehiclePhotos)
				.where(eq(table.vehiclePhotos.galleryId, oldGalleryId));

			for (const photo of templatePhotos) {
				await db.insert(table.vehiclePhotos).values({
					id: crypto.randomUUID(),
					galleryId: newGalleryId,
					imageUrl: photo.imageUrl,
					caption: photo.caption,
					order: photo.order
				});
			}
		}

		// 6. Copy notes (can be linked to user, vehicles, repairs, or vendors)
		const templateNotes = await db.select().from(table.notes).where(
			eq(table.notes.userId, templateUser.uuid)
		);

		// Also get notes linked to template vehicles
		for (const [oldVehicleId] of vehicleIdMap) {
			const vehicleNotes = await db
				.select()
				.from(table.notes)
				.where(eq(table.notes.vehicleId, oldVehicleId));
			templateNotes.push(...vehicleNotes);
		}

		const noteUuidMap = new Map<string, string>();
		for (const note of templateNotes) {
			const newNoteUuid = crypto.randomUUID();
			noteUuidMap.set(note.uuid, newNoteUuid);
			await db.insert(table.notes).values({
				uuid: newNoteUuid,
				title: note.title,
				body: note.body,
				imageUrl: note.imageUrl,
				type: note.type,
				order: note.order,
				parentNoteId: note.parentNoteId ? noteUuidMap.get(note.parentNoteId) || null : null,
				userId: note.userId === templateUser.uuid ? demoUuid : null,
				vehicleId: note.vehicleId ? vehicleIdMap.get(note.vehicleId) || null : null,
				repairId: note.repairId ? repairIdMap.get(note.repairId) || null : null,
				vendorId: note.vendorId ? vendorIdMap.get(note.vendorId) || null : null
			});
		}

		// Create session for the demo user
		const sessionToken = auth.generateSessionToken();
		const session = await auth.createSession(sessionToken, demoUuid);
		auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);

		return redirect(302, '/demo/vehicles');
	}
};
