import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { user, vehicles, notes } from '../src/lib/server/db/schema';

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
	console.log('Seeding Office characters and vehicles...\n');

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
		}
	}

	console.log('\nSeeding complete!');
	console.log('Default password for all users: password123');
}

seed().catch(console.error);
