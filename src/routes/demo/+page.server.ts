import { isRedirect, redirect } from '@sveltejs/kit';
import { eq, inArray } from 'drizzle-orm';
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
		try {
			// Find the demo template user (Creed)
			const [templateUser] = await db
				.select()
				.from(table.user)
				.where(eq(table.user.username, DEMO_TEMPLATE_USERNAME));

			if (!templateUser) {
				return redirect(302, '/sign-in');
			}

			const now = new Date();
			const demoUuid = crypto.randomUUID();
			const demoUsername = `demo-${demoUuid.slice(0, 8)}@frunk.app`;
			const demoPassword = await hashPassword(crypto.randomUUID());

			// Create demo user
			await db.insert(table.user).values({
				uuid: demoUuid,
				username: demoUsername,
				age: templateUser.age,
				passwordHash: demoPassword,
				roles: [ROLE_IDS.DEMO],
				avatar: templateUser.avatar,
				emailVerified: 1
			});

			// Fetch all template data in parallel (3 queries instead of many)
			const [templateVendors, templateVehicles] = await Promise.all([
				db.select().from(table.vendors).where(eq(table.vendors.userId, templateUser.uuid)),
				db.select().from(table.vehicles).where(eq(table.vehicles.userId, templateUser.uuid))
			]);

			// Build ID mappings
			const vendorIdMap = new Map<string, string>();
			for (const vendor of templateVendors) {
				vendorIdMap.set(vendor.id, crypto.randomUUID());
			}

			const vehicleIdMap = new Map<string, string>();
			for (const vehicle of templateVehicles) {
				vehicleIdMap.set(vehicle.id, crypto.randomUUID());
			}

			const oldVehicleIds = [...vehicleIdMap.keys()];

			// Batch insert vendors and vehicles
			if (templateVendors.length > 0) {
				await db.insert(table.vendors).values(
					templateVendors.map((v) => ({
						id: vendorIdMap.get(v.id)!,
						userId: demoUuid,
						name: v.name,
						address: v.address,
						phone: v.phone,
						website: v.website,
						createdAt: now,
						updatedAt: now
					}))
				);
			}

			if (templateVehicles.length > 0) {
				await db.insert(table.vehicles).values(
					templateVehicles.map((v) => ({
						id: vehicleIdMap.get(v.id)!,
						userId: demoUuid,
						make: v.make,
						model: v.model,
						year: v.year,
						vin: v.vin,
						image: v.image,
						createdAt: now,
						updatedAt: now
					}))
				);
			}

			// Fetch repairs, galleries, and notes in parallel (3 queries)
			const [templateRepairs, templateGalleries, templateNotes] = oldVehicleIds.length > 0
				? await Promise.all([
						db.select().from(table.repairs).where(inArray(table.repairs.vehicleId, oldVehicleIds)),
						db.select().from(table.galleries).where(inArray(table.galleries.vehicleId, oldVehicleIds)),
						db.select().from(table.notes).where(inArray(table.notes.vehicleId, oldVehicleIds))
					])
				: [[], [], []];

			// Also fetch user-level notes
			const userNotes = await db.select().from(table.notes).where(eq(table.notes.userId, templateUser.uuid));
			const seenNoteIds = new Set(templateNotes.map((n) => n.id));
			for (const note of userNotes) {
				if (!seenNoteIds.has(note.id)) {
					templateNotes.push(note);
				}
			}

			// Build repair ID mappings
			const repairIdMap = new Map<string, string>();
			for (const repair of templateRepairs) {
				repairIdMap.set(repair.id, crypto.randomUUID());
			}

			// Batch insert repairs
			if (templateRepairs.length > 0) {
				await db.insert(table.repairs).values(
					templateRepairs.map((r) => ({
						id: repairIdMap.get(r.id)!,
						vehicleId: vehicleIdMap.get(r.vehicleId)!,
						vendorId: r.vendorId ? vendorIdMap.get(r.vendorId) || null : null,
						description: r.description,
						date: r.date,
						mileage: r.mileage,
						cost: r.cost,
						status: r.status,
						createdAt: now,
						updatedAt: now
					}))
				);
			}

			// Build gallery ID mappings
			const galleryIdMap = new Map<string, string>();
			for (const gallery of templateGalleries) {
				galleryIdMap.set(gallery.id, crypto.randomUUID());
			}

			// Batch insert galleries
			if (templateGalleries.length > 0) {
				await db.insert(table.galleries).values(
					templateGalleries.map((g) => ({
						id: galleryIdMap.get(g.id)!,
						vehicleId: vehicleIdMap.get(g.vehicleId)!,
						name: g.name,
						description: g.description,
						order: g.order,
						createdAt: now,
						updatedAt: now
					}))
				);
			}

			// Fetch and batch insert vehicle photos
			const oldGalleryIds = [...galleryIdMap.keys()];
			if (oldGalleryIds.length > 0) {
				const templatePhotos = await db.select().from(table.vehiclePhotos)
					.where(inArray(table.vehiclePhotos.galleryId, oldGalleryIds));

				if (templatePhotos.length > 0) {
					await db.insert(table.vehiclePhotos).values(
						templatePhotos.map((p) => ({
							id: crypto.randomUUID(),
							galleryId: galleryIdMap.get(p.galleryId)!,
							imageUrl: p.imageUrl,
							caption: p.caption,
							order: p.order,
							createdAt: now,
							updatedAt: now
						}))
					);
				}
			}

			// Batch insert notes
			if (templateNotes.length > 0) {
				const noteUuidMap = new Map<string, string>();
				for (const note of templateNotes) {
					noteUuidMap.set(note.uuid, crypto.randomUUID());
				}

				await db.insert(table.notes).values(
					templateNotes.map((n) => ({
						uuid: noteUuidMap.get(n.uuid)!,
						title: n.title,
						body: n.body,
						imageUrl: n.imageUrl,
						type: n.type,
						order: n.order,
						parentNoteId: n.parentNoteId ? noteUuidMap.get(n.parentNoteId) || null : null,
						userId: n.userId === templateUser.uuid ? demoUuid : null,
						vehicleId: n.vehicleId ? vehicleIdMap.get(n.vehicleId) || null : null,
						repairId: n.repairId ? repairIdMap.get(n.repairId) || null : null,
						vendorId: n.vendorId ? vendorIdMap.get(n.vendorId) || null : null,
						createdAt: now,
						updatedAt: now
					}))
				);
			}

			// Create session for the demo user
			const sessionToken = auth.generateSessionToken();
			const session = await auth.createSession(sessionToken, demoUuid);
			auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);

			return redirect(302, '/demo/vehicles');
		} catch (err) {
			if (isRedirect(err)) throw err;
			const cause = err instanceof Error && 'cause' in err && err.cause instanceof Error ? err.cause.message : '';
			const message = err instanceof Error ? err.message : 'Unknown error';
			const fullMessage = cause ? `${message} | Cause: ${cause}` : message;
			console.error('Demo creation failed:', err);
			return redirect(302, `/?demo-error=${encodeURIComponent(fullMessage)}`);
		}
	}
};
