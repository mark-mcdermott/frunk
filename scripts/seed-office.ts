import { inArray } from 'drizzle-orm';
import {
	user,
	vehicles,
	notes,
	vendors,
	repairs,
	session,
	galleries,
	vehiclePhotos,
	maintenanceSchedules
} from '../src/lib/server/db/schema';
import { addMonths, TEMPLATES } from '../src/lib/maintenance';
import { ROLE_IDS } from '../src/lib/roles';
import { describeTarget, scriptDb } from './db';

/**
 * Sample data: seventeen Office characters with vehicles, vendors, repairs, notes and
 * photo galleries. Ported near-verbatim from `legacy/scripts/seed-office.ts`.
 *
 * Two things changed. Passwords are gone — Decision 2 replaced them with passkeys, and
 * a passkey cannot be seeded because it is bound to a physical authenticator. So these
 * accounts have no way to sign in, which is fine: they are fixtures, not logins.
 *
 * Creed is the exception that matters. He is the template `POST /api/demo` clones, so
 * he gets the full set of data and a `DEMO` role, and this script is what makes the
 * demo work at all (`src/lib/server/demo.ts`).
 */

const db = scriptDb();

// Office characters with their vehicles
// Avatar images stored on R2
/*
 * Sample imagery ships with the site, under `public/samples/`, and is referenced by
 * app-relative path. It lived in a public Cloudflare R2 bucket until 2026-09-21, when
 * the bucket went with the Cloudflare account and every seeded photo broke at once;
 * files in the repo cannot be retired out from under the database.
 */
const AVATAR_BASE = '/samples/headshots';
const VEHICLE_BASE = '/samples/vehicles';
const DOC_BASE = '/documents/samples';
const GALLERY_BASE = '/samples/gallery';

// Helper to generate vehicle image filename
function getVehicleImage(make: string, model: string, year: number): string {
	const filename = `${make}-${model}-${year}.jpg`.toLowerCase().replace(/ /g, '-');
	return `${VEHICLE_BASE}/${filename}`;
}

// Note templates - randomly assigned to vehicles
const noteTemplates = [
	{
		title: 'Vehicle Title',
		body: 'Original title document for this vehicle.',
		imageUrl: `${DOC_BASE}/sample-title.svg`
	},
	{
		title: 'Registration',
		body: 'Current registration card - expires December 2025.',
		imageUrl: `${DOC_BASE}/sample-registration.svg`
	},
	{
		title: 'Insurance Policy',
		body: 'Full coverage with State Farm. Policy #12345.',
		imageUrl: `${DOC_BASE}/sample-insurance.svg`
	},
	{
		title: 'Oil Change Receipt',
		body: 'Last oil change performed at Jiffy Lube. Next due at 85,000 miles.',
		imageUrl: `${DOC_BASE}/sample-receipt.svg`
	},
	{
		title: 'Purchase Notes',
		body: 'Bought from CarMax in Springfield. Clean Carfax, one previous owner.',
		imageUrl: null
	},
	{
		title: 'Known Issues',
		body: 'Small dent on rear bumper. AC needs recharge in summer.',
		imageUrl: null
	}
];

// Get random subset of notes for a vehicle
function getNotesForVehicle(): typeof noteTemplates {
	// Randomly select 1-4 notes for each vehicle
	const count = Math.floor(Math.random() * 4) + 1;
	const shuffled = [...noteTemplates].sort(() => Math.random() - 0.5);
	return shuffled.slice(0, count);
}

// Vendor templates - Scranton area auto shops
const vendorTemplates = [
	{
		name: 'Vance Refrigeration Auto',
		address: '1725 Slough Ave, Scranton, PA 18503',
		phone: '(570) 555-0101',
		website: 'https://vancerefrigeration.com'
	},
	{
		name: 'Schrute Farms Garage',
		address: '1812 Rural Route 6, Honesdale, PA 18431',
		phone: '(570) 555-0102',
		website: null
	},
	{
		name: "Poor Richard's Auto",
		address: '42 Main St, Scranton, PA 18503',
		phone: '(570) 555-0103',
		website: 'https://poorrichardsauto.com'
	},
	{
		name: 'Steamtown Auto Care',
		address: '150 Lackawanna Ave, Scranton, PA 18503',
		phone: '(570) 555-0104',
		website: null
	},
	{
		name: "Alfredo's Auto Cafe",
		address: '88 Pizza Lane, Scranton, PA 18503',
		phone: '(570) 555-0105',
		website: 'https://alfredosauto.com'
	}
];

// Repair templates with realistic costs (in cents) and descriptions
const repairTemplates = [
	{ description: 'Oil change', cost: 4500, status: 'completed' },
	{ description: 'Tire rotation', cost: 2500, status: 'completed' },
	{ description: 'Brake pad replacement', cost: 35000, status: 'completed' },
	{ description: 'Battery replacement', cost: 18000, status: 'completed' },
	{ description: 'Air filter replacement', cost: 3500, status: 'completed' },
	{ description: 'Transmission fluid change', cost: 15000, status: 'completed' },
	{ description: 'Coolant flush', cost: 12000, status: 'completed' },
	{ description: 'Spark plug replacement', cost: 20000, status: 'completed' },
	{ description: 'Windshield wiper replacement', cost: 2500, status: 'completed' },
	{ description: 'Alignment', cost: 8500, status: 'completed' },
	{ description: 'AC recharge', cost: 15000, status: 'completed' },
	{ description: 'Check engine light diagnosis', cost: 10000, status: 'completed' },
	{ description: 'Timing belt replacement', cost: 65000, status: 'completed' },
	{ description: 'Water pump replacement', cost: 45000, status: 'completed' },
	{ description: 'Alternator replacement', cost: 55000, status: 'completed' },
	{ description: 'Scheduled maintenance - 60k miles', cost: 45000, status: 'scheduled' },
	{ description: 'State inspection', cost: 3500, status: 'scheduled' },
	{ description: 'Suspension work', cost: 80000, status: 'in_progress' }
];

// Gallery templates with associated photos
const galleryTemplates = [
	{
		name: 'Exterior',
		description: 'Outside views of the vehicle',
		photos: [
			{ filename: 'car-front.jpg', caption: 'Front view' },
			{ filename: 'car-side.jpg', caption: 'Side profile' },
			{ filename: 'car-rear.jpg', caption: 'Rear view' }
		]
	},
	{
		name: 'Interior',
		description: 'Inside the cabin',
		photos: [{ filename: 'car-interior.jpg', caption: 'Dashboard and seats' }]
	},
	{
		name: 'Details',
		description: 'Close-up detail shots',
		photos: [
			{ filename: 'car-detail.jpg', caption: 'Detail shot' },
			{ filename: 'car-wheel.jpg', caption: 'Wheel and tire' }
		]
	}
];

// Get random galleries for a vehicle (0-2 galleries, each with 2+ photos)
function getGalleriesForVehicle(): typeof galleryTemplates {
	// 30% chance of no galleries, 70% chance of 1-2 galleries
	if (Math.random() < 0.3) return [];
	const count = Math.floor(Math.random() * 2) + 1; // 1-2 galleries
	const shuffled = [...galleryTemplates].sort(() => Math.random() - 0.5);
	return shuffled.slice(0, count);
}

// Get random date within last 2 years
function getRandomPastDate(): Date {
	const now = new Date();
	const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
	const randomTime =
		twoYearsAgo.getTime() + Math.random() * (now.getTime() - twoYearsAgo.getTime());
	return new Date(randomTime);
}

// Get random future date within next 3 months (for scheduled repairs)
function getRandomFutureDate(): Date {
	const now = new Date();
	const threeMonthsFromNow = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
	const randomTime = now.getTime() + Math.random() * (threeMonthsFromNow.getTime() - now.getTime());
	return new Date(randomTime);
}

// Get random mileage based on vehicle year
/**
 * Four schedules per vehicle, one in each state the screens can show — overdue, due
 * soon, on track, and never done — so a demo garage has something to badge and the
 * digest has something to say. Offsets are from the odometer reading and today.
 */
function schedulesFor(currentMileage: number, now: Date) {
	const [oil, tires, brakes, airFilter] = TEMPLATES;
	return [
		{ ...oil!, lastCompletedDate: addMonths(now, -7), lastCompletedMileage: currentMileage - 5600 },
		{
			...tires!,
			lastCompletedDate: addMonths(now, -5),
			lastCompletedMileage: currentMileage - 5700
		},
		{
			...brakes!,
			lastCompletedDate: addMonths(now, -3),
			lastCompletedMileage: currentMileage - 3000
		},
		{ ...airFilter!, lastCompletedDate: null, lastCompletedMileage: null }
	];
}

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
const now = new Date();

function getRandomMileage(vehicleYear: number): number {
	const currentYear = new Date().getFullYear();
	const age = currentYear - vehicleYear;
	// Assume ~12k miles per year average
	const estimatedMiles = age * 12000;
	// Add some variance (+/- 30%)
	const variance = estimatedMiles * 0.3;
	return Math.floor(estimatedMiles + (Math.random() * variance * 2 - variance));
}

// Get random subset of vendors for a user (1-3 vendors)
function getVendorsForUser(): typeof vendorTemplates {
	const count = Math.floor(Math.random() * 3) + 1;
	const shuffled = [...vendorTemplates].sort(() => Math.random() - 0.5);
	return shuffled.slice(0, count);
}

// Get random repairs for a vehicle (0-4 repairs)
function getRepairsForVehicle(): typeof repairTemplates {
	const count = Math.floor(Math.random() * 5); // 0-4 repairs
	const shuffled = [...repairTemplates].sort(() => Math.random() - 0.5);
	return shuffled.slice(0, count);
}

const officeCharacters = [
	{
		username: 'michael.scott@dundermifflin.com',
		age: 46,
		roles: [ROLE_IDS.ADMIN, ROLE_IDS.USER],
		avatar: `${AVATAR_BASE}/michael-scott.png`,
		vehicles: [
			{ make: 'Chrysler', model: 'Sebring', year: 2004, vin: '1C3EL65R04N123456' },
			{ make: 'Porsche', model: 'Boxster', year: 2008, vin: 'WP0CA29848S654321' }
		]
	},
	{
		username: 'dwight.schrute@dundermifflin.com',
		age: 42,
		roles: [ROLE_IDS.USER],
		avatar: `${AVATAR_BASE}/dwight-schrute.png`,
		vehicles: [
			{ make: 'Pontiac', model: 'Trans Am', year: 1987, vin: '1G2FW87H9HL234567' },
			{ make: 'Ford', model: 'Taurus', year: 2001, vin: '1FAFP53U41A987654' }
		]
	},
	{
		username: 'jim.halpert@dundermifflin.com',
		age: 34,
		roles: [ROLE_IDS.USER],
		avatar: `${AVATAR_BASE}/jim-halpert.png`,
		vehicles: [
			{ make: 'Subaru', model: 'Outback', year: 2010, vin: '4S4BRBCC8A3456789' },
			{ make: 'Saab', model: '9-3', year: 2006, vin: 'YS3FB49S661234567' }
		]
	},
	{
		username: 'pam.beesly@dundermifflin.com',
		age: 33,
		roles: [ROLE_IDS.USER],
		avatar: `${AVATAR_BASE}/pam-beesly.png`,
		vehicles: [{ make: 'Toyota', model: 'Yaris', year: 2007, vin: 'JTDBT923071234567' }]
	},
	{
		username: 'andy.bernard@dundermifflin.com',
		age: 38,
		roles: [ROLE_IDS.USER],
		avatar: `${AVATAR_BASE}/andy-bernard.png`,
		vehicles: [
			{ make: 'Toyota', model: 'Prius', year: 2009, vin: 'JTDKN3DU9A0123456' },
			{ make: 'Nissan', model: 'Xterra', year: 2006, vin: '5N1AN08W26C654321' }
		]
	},
	{
		username: 'angela.martin@dundermifflin.com',
		age: 40,
		roles: [ROLE_IDS.USER],
		avatar: `${AVATAR_BASE}/angela-martin.png`,
		vehicles: [{ make: 'Volkswagen', model: 'Jetta', year: 2005, vin: '3VWSE69M55M123456' }]
	},
	{
		username: 'kevin.malone@dundermifflin.com',
		age: 44,
		roles: [ROLE_IDS.USER],
		avatar: `${AVATAR_BASE}/kevin-malone.png`,
		vehicles: [{ make: 'Chevrolet', model: 'Monte Carlo', year: 1999, vin: '2G1WX12K7Y9234567' }]
	},
	{
		username: 'oscar.martinez@dundermifflin.com',
		age: 41,
		roles: [ROLE_IDS.USER],
		avatar: `${AVATAR_BASE}/oscar-martinez.png`,
		vehicles: [{ make: 'Honda', model: 'Accord', year: 2008, vin: '1HGCP26878A123456' }]
	},
	{
		username: 'stanley.hudson@dundermifflin.com',
		age: 54,
		roles: [ROLE_IDS.USER],
		avatar: `${AVATAR_BASE}/stanley-hudson.png`,
		vehicles: [
			{ make: 'Chrysler', model: '300', year: 2006, vin: '2C3KA53G66H789012' },
			{ make: 'Lincoln', model: 'Town Car', year: 2003, vin: '1LNHM82W93Y456789' }
		]
	},
	{
		username: 'phyllis.vance@dundermifflin.com',
		age: 52,
		roles: [ROLE_IDS.USER],
		avatar: `${AVATAR_BASE}/phyllis-vance.png`,
		vehicles: [{ make: 'Buick', model: 'LaCrosse', year: 2010, vin: '1G4GC5GC3AF123456' }]
	},
	{
		username: 'meredith.palmer@dundermifflin.com',
		age: 48,
		roles: [ROLE_IDS.USER],
		avatar: `${AVATAR_BASE}/meredith-palmer.png`,
		vehicles: [{ make: 'Dodge', model: 'Neon', year: 2002, vin: '1B3ES56C42D654321' }]
	},
	{
		username: 'creed.bratton@dundermifflin.com',
		age: 65,
		roles: [ROLE_IDS.DEMO],
		avatar: `${AVATAR_BASE}/creed-bratton.png`,
		isDemo: true, // Flag to give this user full data for demo purposes
		vehicles: [
			{ make: 'AMC', model: 'Gremlin', year: 1974, vin: 'A4A158A123456' },
			{ make: 'Ford', model: 'Pinto', year: 1976, vin: '6X11Y123456' },
			{ make: 'Chevrolet', model: 'Corvair', year: 1965, vin: 'W0739W100001' }
		]
	},
	{
		username: 'toby.flenderson@dundermifflin.com',
		age: 44,
		roles: [ROLE_IDS.USER],
		avatar: `${AVATAR_BASE}/toby-flenderson.png`,
		vehicles: [{ make: 'Honda', model: 'Civic', year: 2005, vin: '2HGES16505H567890' }]
	},
	{
		username: 'kelly.kapoor@dundermifflin.com',
		age: 29,
		roles: [ROLE_IDS.USER],
		avatar: `${AVATAR_BASE}/kelly-kapoor.png`,
		vehicles: [{ make: 'Volkswagen', model: 'Beetle', year: 2008, vin: '3VWRG3AG3AM123456' }]
	},
	{
		username: 'ryan.howard@dundermifflin.com',
		age: 30,
		roles: [ROLE_IDS.USER],
		avatar: `${AVATAR_BASE}/ryan-howard.png`,
		vehicles: [{ make: 'BMW', model: '3 Series', year: 2009, vin: 'WBAPH5C55BA654321' }]
	},
	{
		username: 'darryl.philbin@dundermifflin.com',
		age: 38,
		roles: [ROLE_IDS.USER],
		avatar: `${AVATAR_BASE}/darryl-philbin.png`,
		vehicles: [{ make: 'Ford', model: 'F-150', year: 2007, vin: '1FTPW14V87KD12345' }]
	},
	{
		username: 'erin.hannon@dundermifflin.com',
		age: 26,
		roles: [ROLE_IDS.USER],
		avatar: `${AVATAR_BASE}/erin-hannon.png`,
		vehicles: [{ make: 'Kia', model: 'Rio', year: 2010, vin: 'KNADN4A39A6123456' }]
	}
];

async function seed() {
	console.log(`Seeding Office characters into ${describeTarget()}...\n`);

	// Clear existing seed data (in reverse order of dependencies)
	console.log('Clearing existing data...');
	const usernames = officeCharacters.map((c) => c.username);

	// Get existing user UUIDs for these usernames
	const existingUsers = await db
		.select({ id: user.id })
		.from(user)
		.where(inArray(user.email, usernames));

	if (existingUsers.length > 0) {
		const existingUuids = existingUsers.map((u) => u.id);

		// Delete in order: sessions -> repairs -> notes -> vehicles -> vendors -> users
		// (repairs and notes cascade from vehicles, vendors set null on repair)
		await db.delete(session).where(inArray(session.userId, existingUuids));
		await db.delete(vehicles).where(inArray(vehicles.userId, existingUuids));
		await db.delete(vendors).where(inArray(vendors.userId, existingUuids));
		await db.delete(user).where(inArray(user.id, existingUuids));
		console.log(`Cleared ${existingUsers.length} existing users and their data.\n`);
	}

	for (const character of officeCharacters) {
		const userUuid = crypto.randomUUID();

		// Insert user
		await db
			.insert(user)
			.values({
				id: userUuid,
				// Better Auth requires `name`. The characters carry no separate display
				// name, so the address's local part stands in.
				name: character.username.split('@')[0] ?? character.username,
				email: character.username,
				age: character.age,
				roles: character.roles,
				image: character.avatar,
				emailVerified: true
			})
			.onConflictDoNothing();

		console.log(`Created user: ${character.username}`);

		// Check if this is the demo template user (gets all data)
		const isDemo = 'isDemo' in character && character.isDemo;

		// Create vendors for this user
		// Demo user gets all vendors, others get random subset
		const userVendors = isDemo ? vendorTemplates : getVendorsForUser();
		const vendorIds: string[] = [];
		for (const vendor of userVendors) {
			const vendorId = crypto.randomUUID();
			vendorIds.push(vendorId);
			await db.insert(vendors).values({
				id: vendorId,
				userId: userUuid,
				name: vendor.name,
				address: vendor.address,
				phone: vendor.phone,
				website: vendor.website
			});
			console.log(`  + Added vendor: ${vendor.name}`);
		}

		// Insert vehicles for this user
		for (const [vi, vehicle] of character.vehicles.entries()) {
			const vehicleId = crypto.randomUUID();
			// The demo garage is deterministic so the journeys can reason about it.
			const currentMileage = isDemo ? [84200, 61500, 112300][vi]! : getRandomMileage(vehicle.year);
			await db.insert(vehicles).values({
				id: vehicleId,
				userId: userUuid,
				make: vehicle.make,
				model: vehicle.model,
				year: vehicle.year,
				vin: vehicle.vin,
				currentMileage,
				// Registration inside the due-soon window, the rest comfortably ahead.
				registrationExpiration: addDays(now, 12),
				inspectionExpiration: addMonths(now, 8),
				insuranceProvider: 'State Farm',
				insuranceExpiration: addMonths(now, 3),
				image: getVehicleImage(vehicle.make, vehicle.model, vehicle.year)
			});

			console.log(`  - Added vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}`);

			for (const schedule of schedulesFor(currentMileage, now)) {
				await db
					.insert(maintenanceSchedules)
					.values({ id: crypto.randomUUID(), vehicleId, ...schedule });
				console.log(`    ⏱ Added schedule: ${schedule.name}`);
			}

			// Add notes to this vehicle (demo user gets all, others get random)
			const vehicleNotes = isDemo ? noteTemplates : getNotesForVehicle();
			for (const note of vehicleNotes) {
				await db.insert(notes).values({
					uuid: crypto.randomUUID(),
					title: note.title,
					body: note.body,
					imageUrl: note.imageUrl,
					type: 'note',
					vehicleId: vehicleId
				});
				console.log(`    • Added note: ${note.title}`);
			}

			// Add repairs to this vehicle (demo user gets more, others get random)
			const vehicleRepairs = isDemo ? repairTemplates.slice(0, 8) : getRepairsForVehicle();
			for (const repair of vehicleRepairs) {
				const repairId = crypto.randomUUID();
				// Randomly assign a vendor (or none)
				const vendorId =
					vendorIds.length > 0 && Math.random() > 0.3
						? (vendorIds[Math.floor(Math.random() * vendorIds.length)] ?? null)
						: null;

				// Use appropriate date based on status
				const repairDate =
					repair.status === 'scheduled' ? getRandomFutureDate() : getRandomPastDate();

				await db.insert(repairs).values({
					id: repairId,
					vehicleId: vehicleId,
					vendorId: vendorId,
					description: repair.description,
					date: repairDate,
					// Somewhere in the last stretch of the odometer; a booked service is at the reading.
					mileage:
						repair.status === 'scheduled'
							? currentMileage
							: Math.max(0, currentMileage - Math.floor(Math.random() * 20000)),
					cost: repair.cost,
					status: repair.status
				});
				console.log(`    ⚙ Added repair: ${repair.description} (${repair.status})`);
			}

			// Add galleries with photos to this vehicle (demo user gets all, others get random)
			const vehicleGalleries = isDemo ? galleryTemplates : getGalleriesForVehicle();
			for (const [gi, gallery] of vehicleGalleries.entries()) {
				const galleryId = crypto.randomUUID();

				await db.insert(galleries).values({
					id: galleryId,
					vehicleId: vehicleId,
					name: gallery.name,
					description: gallery.description,
					order: gi
				});
				console.log(`    📁 Added gallery: ${gallery.name}`);

				// Add photos to this gallery
				for (const [pi, photo] of gallery.photos.entries()) {
					await db.insert(vehiclePhotos).values({
						id: crypto.randomUUID(),
						galleryId: galleryId,
						imageUrl: `${GALLERY_BASE}/${photo.filename}`,
						caption: photo.caption,
						order: pi
					});
					console.log(`      📷 Added photo: ${photo.caption}`);
				}
			}
		}
	}

	console.log('\nSeeding complete.');
	console.log('These accounts have no passkey, so none of them can be signed into —');
	console.log('they are fixtures. Creed is the template POST /api/demo clones.');
}

seed().catch((cause) => {
	console.error(cause);
	process.exitCode = 1;
});
