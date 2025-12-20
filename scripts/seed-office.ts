import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { inArray } from 'drizzle-orm';
import { user, vehicles, notes, vendors, repairs, session, galleries, vehiclePhotos } from '../src/lib/server/db/schema';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = neon(DATABASE_URL);
const db = drizzle(client);

// Password hashing (same as src/lib/server/password.ts)
const ITERATIONS = 100000;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

async function hashPassword(password: string): Promise<string> {
	const encoder = new TextEncoder();
	const passwordBuffer = encoder.encode(password);
	const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
	const keyMaterial = await crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, [
		'deriveBits'
	]);
	const derivedBits = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', salt: salt, iterations: ITERATIONS, hash: 'SHA-256' },
		keyMaterial,
		KEY_LENGTH * 8
	);
	const saltBase64 = arrayBufferToBase64(salt.buffer);
	const hashBase64 = arrayBufferToBase64(derivedBits);
	return `pbkdf2:${ITERATIONS}:${saltBase64}:${hashBase64}`;
}

// Office characters with their vehicles
// Avatar images stored on R2
const AVATAR_BASE = 'https://pub-8578b5b18a5e41269fa51ae28e78a0a8.r2.dev/headshots';
const VEHICLE_BASE = 'https://pub-8578b5b18a5e41269fa51ae28e78a0a8.r2.dev/vehicles';
const DOC_BASE = 'https://pub-8578b5b18a5e41269fa51ae28e78a0a8.r2.dev/documents/samples';
const GALLERY_BASE = 'https://pub-8578b5b18a5e41269fa51ae28e78a0a8.r2.dev/gallery';

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
		imageUrl: `${DOC_BASE}/sample-title.jpg`
	},
	{
		title: 'Registration',
		body: 'Current registration card - expires December 2025.',
		imageUrl: `${DOC_BASE}/sample-registration.jpg`
	},
	{
		title: 'Insurance Policy',
		body: 'Full coverage with State Farm. Policy #12345.',
		imageUrl: `${DOC_BASE}/sample-insurance.jpg`
	},
	{
		title: 'Oil Change Receipt',
		body: 'Last oil change performed at Jiffy Lube. Next due at 85,000 miles.',
		imageUrl: `${DOC_BASE}/sample-receipt.jpg`
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
		name: "Vance Refrigeration Auto",
		address: "1725 Slough Ave, Scranton, PA 18503",
		phone: "(570) 555-0101",
		website: "https://vancerefrigeration.com"
	},
	{
		name: "Schrute Farms Garage",
		address: "1812 Rural Route 6, Honesdale, PA 18431",
		phone: "(570) 555-0102",
		website: null
	},
	{
		name: "Poor Richard's Auto",
		address: "42 Main St, Scranton, PA 18503",
		phone: "(570) 555-0103",
		website: "https://poorrichardsauto.com"
	},
	{
		name: "Steamtown Auto Care",
		address: "150 Lackawanna Ave, Scranton, PA 18503",
		phone: "(570) 555-0104",
		website: null
	},
	{
		name: "Alfredo's Auto Cafe",
		address: "88 Pizza Lane, Scranton, PA 18503",
		phone: "(570) 555-0105",
		website: "https://alfredosauto.com"
	}
];

// Repair templates with realistic costs (in cents) and descriptions
const repairTemplates = [
	{ description: "Oil change", cost: 4500, status: "completed" },
	{ description: "Tire rotation", cost: 2500, status: "completed" },
	{ description: "Brake pad replacement", cost: 35000, status: "completed" },
	{ description: "Battery replacement", cost: 18000, status: "completed" },
	{ description: "Air filter replacement", cost: 3500, status: "completed" },
	{ description: "Transmission fluid change", cost: 15000, status: "completed" },
	{ description: "Coolant flush", cost: 12000, status: "completed" },
	{ description: "Spark plug replacement", cost: 20000, status: "completed" },
	{ description: "Windshield wiper replacement", cost: 2500, status: "completed" },
	{ description: "Alignment", cost: 8500, status: "completed" },
	{ description: "AC recharge", cost: 15000, status: "completed" },
	{ description: "Check engine light diagnosis", cost: 10000, status: "completed" },
	{ description: "Timing belt replacement", cost: 65000, status: "completed" },
	{ description: "Water pump replacement", cost: 45000, status: "completed" },
	{ description: "Alternator replacement", cost: 55000, status: "completed" },
	{ description: "Scheduled maintenance - 60k miles", cost: 45000, status: "scheduled" },
	{ description: "State inspection", cost: 3500, status: "scheduled" },
	{ description: "Suspension work", cost: 80000, status: "in_progress" }
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
		photos: [
			{ filename: 'car-interior.jpg', caption: 'Dashboard and seats' }
		]
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
	const randomTime = twoYearsAgo.getTime() + Math.random() * (now.getTime() - twoYearsAgo.getTime());
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
		admin: 1,
		avatar: `${AVATAR_BASE}/michael-scott.png`,
		vehicles: [
			{ make: 'Chrysler', model: 'Sebring', year: 2004, vin: '1C3EL65R04N123456' },
			{ make: 'Porsche', model: 'Boxster', year: 2008, vin: 'WP0CA29848S654321' }
		]
	},
	{
		username: 'dwight.schrute@dundermifflin.com',
		age: 42,
		admin: 0,
		avatar: `${AVATAR_BASE}/dwight-schrute.png`,
		vehicles: [
			{ make: 'Pontiac', model: 'Trans Am', year: 1987, vin: '1G2FW87H9HL234567' },
			{ make: 'Ford', model: 'Taurus', year: 2001, vin: '1FAFP53U41A987654' }
		]
	},
	{
		username: 'jim.halpert@dundermifflin.com',
		age: 34,
		admin: 0,
		avatar: `${AVATAR_BASE}/jim-halpert.png`,
		vehicles: [
			{ make: 'Subaru', model: 'Outback', year: 2010, vin: '4S4BRBCC8A3456789' },
			{ make: 'Saab', model: '9-3', year: 2006, vin: 'YS3FB49S661234567' }
		]
	},
	{
		username: 'pam.beesly@dundermifflin.com',
		age: 33,
		admin: 0,
		avatar: `${AVATAR_BASE}/pam-beesly.png`,
		vehicles: [
			{ make: 'Toyota', model: 'Yaris', year: 2007, vin: 'JTDBT923071234567' }
		]
	},
	{
		username: 'andy.bernard@dundermifflin.com',
		age: 38,
		admin: 0,
		avatar: `${AVATAR_BASE}/andy-bernard.png`,
		vehicles: [
			{ make: 'Toyota', model: 'Prius', year: 2009, vin: 'JTDKN3DU9A0123456' },
			{ make: 'Nissan', model: 'Xterra', year: 2006, vin: '5N1AN08W26C654321' }
		]
	},
	{
		username: 'angela.martin@dundermifflin.com',
		age: 40,
		admin: 0,
		avatar: `${AVATAR_BASE}/angela-martin.png`,
		vehicles: [
			{ make: 'Volkswagen', model: 'Jetta', year: 2005, vin: '3VWSE69M55M123456' }
		]
	},
	{
		username: 'kevin.malone@dundermifflin.com',
		age: 44,
		admin: 0,
		avatar: `${AVATAR_BASE}/kevin-malone.png`,
		vehicles: [
			{ make: 'Chevrolet', model: 'Monte Carlo', year: 1999, vin: '2G1WX12K7Y9234567' }
		]
	},
	{
		username: 'oscar.martinez@dundermifflin.com',
		age: 41,
		admin: 0,
		avatar: `${AVATAR_BASE}/oscar-martinez.png`,
		vehicles: [
			{ make: 'Honda', model: 'Accord', year: 2008, vin: '1HGCP26878A123456' }
		]
	},
	{
		username: 'stanley.hudson@dundermifflin.com',
		age: 54,
		admin: 0,
		avatar: `${AVATAR_BASE}/stanley-hudson.png`,
		vehicles: [
			{ make: 'Chrysler', model: '300', year: 2006, vin: '2C3KA53G66H789012' },
			{ make: 'Lincoln', model: 'Town Car', year: 2003, vin: '1LNHM82W93Y456789' }
		]
	},
	{
		username: 'phyllis.vance@dundermifflin.com',
		age: 52,
		admin: 0,
		avatar: `${AVATAR_BASE}/phyllis-vance.png`,
		vehicles: [
			{ make: 'Buick', model: 'LaCrosse', year: 2010, vin: '1G4GC5GC3AF123456' }
		]
	},
	{
		username: 'meredith.palmer@dundermifflin.com',
		age: 48,
		admin: 0,
		avatar: `${AVATAR_BASE}/meredith-palmer.png`,
		vehicles: [
			{ make: 'Dodge', model: 'Neon', year: 2002, vin: '1B3ES56C42D654321' }
		]
	},
	{
		username: 'creed.bratton@dundermifflin.com',
		age: 65,
		admin: 0,
		avatar: `${AVATAR_BASE}/creed-bratton.png`,
		vehicles: [
			{ make: 'AMC', model: 'Gremlin', year: 1974, vin: 'A4A158A123456' },
			{ make: 'Ford', model: 'Pinto', year: 1976, vin: '6X11Y123456' }
		]
	},
	{
		username: 'toby.flenderson@dundermifflin.com',
		age: 44,
		admin: 0,
		avatar: `${AVATAR_BASE}/toby-flenderson.png`,
		vehicles: [
			{ make: 'Honda', model: 'Civic', year: 2005, vin: '2HGES16505H567890' }
		]
	},
	{
		username: 'kelly.kapoor@dundermifflin.com',
		age: 29,
		admin: 0,
		avatar: `${AVATAR_BASE}/kelly-kapoor.png`,
		vehicles: [
			{ make: 'Volkswagen', model: 'Beetle', year: 2008, vin: '3VWRG3AG3AM123456' }
		]
	},
	{
		username: 'ryan.howard@dundermifflin.com',
		age: 30,
		admin: 0,
		avatar: `${AVATAR_BASE}/ryan-howard.png`,
		vehicles: [
			{ make: 'BMW', model: '3 Series', year: 2009, vin: 'WBAPH5C55BA654321' }
		]
	},
	{
		username: 'darryl.philbin@dundermifflin.com',
		age: 38,
		admin: 0,
		avatar: `${AVATAR_BASE}/darryl-philbin.png`,
		vehicles: [
			{ make: 'Ford', model: 'F-150', year: 2007, vin: '1FTPW14V87KD12345' }
		]
	},
	{
		username: 'erin.hannon@dundermifflin.com',
		age: 26,
		admin: 0,
		avatar: `${AVATAR_BASE}/erin-hannon.png`,
		vehicles: [
			{ make: 'Kia', model: 'Rio', year: 2010, vin: 'KNADN4A39A6123456' }
		]
	}
];

async function seed() {
	console.log('Seeding Office characters, vehicles, vendors, and repairs...\n');

	// Clear existing seed data (in reverse order of dependencies)
	console.log('Clearing existing data...');
	const usernames = officeCharacters.map(c => c.username);

	// Get existing user UUIDs for these usernames
	const existingUsers = await db
		.select({ uuid: user.uuid })
		.from(user)
		.where(inArray(user.username, usernames));

	if (existingUsers.length > 0) {
		const existingUuids = existingUsers.map(u => u.uuid);

		// Delete in order: sessions -> repairs -> notes -> vehicles -> vendors -> users
		// (repairs and notes cascade from vehicles, vendors set null on repair)
		await db.delete(session).where(inArray(session.userId, existingUuids));
		await db.delete(vehicles).where(inArray(vehicles.userId, existingUuids));
		await db.delete(vendors).where(inArray(vendors.userId, existingUuids));
		await db.delete(user).where(inArray(user.uuid, existingUuids));
		console.log(`Cleared ${existingUsers.length} existing users and their data.\n`);
	}

	const defaultPassword = await hashPassword('password123');

	for (const character of officeCharacters) {
		const userUuid = crypto.randomUUID();

		// Insert user
		await db.insert(user).values({
			uuid: userUuid,
			username: character.username,
			age: character.age,
			passwordHash: defaultPassword,
			admin: character.admin,
			avatar: character.avatar,
			emailVerified: 1
		}).onConflictDoNothing();

		console.log(`Created user: ${character.username}`);

		// Create vendors for this user
		const userVendors = getVendorsForUser();
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
		for (const vehicle of character.vehicles) {
			const vehicleId = crypto.randomUUID();
			await db.insert(vehicles).values({
				id: vehicleId,
				userId: userUuid,
				make: vehicle.make,
				model: vehicle.model,
				year: vehicle.year,
				vin: vehicle.vin,
				image: getVehicleImage(vehicle.make, vehicle.model, vehicle.year)
			});

			console.log(`  - Added vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}`);

			// Add random notes to this vehicle
			const vehicleNotes = getNotesForVehicle();
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

			// Add random repairs to this vehicle
			const vehicleRepairs = getRepairsForVehicle();
			for (const repair of vehicleRepairs) {
				const repairId = crypto.randomUUID();
				// Randomly assign a vendor (or none)
				const vendorId = vendorIds.length > 0 && Math.random() > 0.3
					? vendorIds[Math.floor(Math.random() * vendorIds.length)]
					: null;

				// Use appropriate date based on status
				const repairDate = repair.status === 'scheduled'
					? getRandomFutureDate()
					: getRandomPastDate();

				await db.insert(repairs).values({
					id: repairId,
					vehicleId: vehicleId,
					vendorId: vendorId,
					description: repair.description,
					date: repairDate,
					mileage: getRandomMileage(vehicle.year),
					cost: repair.cost,
					status: repair.status
				});
				console.log(`    ⚙ Added repair: ${repair.description} (${repair.status})`);
			}

			// Add random galleries with photos to this vehicle
			const vehicleGalleries = getGalleriesForVehicle();
			for (let gi = 0; gi < vehicleGalleries.length; gi++) {
				const gallery = vehicleGalleries[gi];
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
				for (let pi = 0; pi < gallery.photos.length; pi++) {
					const photo = gallery.photos[pi];
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

	console.log('\nSeeding complete!');
	console.log('Default password for all users: password123');
}

seed().catch(console.error);
