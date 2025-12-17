import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { encodeBase32LowerCase } from '@oslojs/encoding';
import { user } from '../src/lib/server/db/schema';
import { hashPassword } from '../src/lib/server/password';

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL environment variable is required');
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

function generateUserId() {
	const bytes = crypto.getRandomValues(new Uint8Array(15));
	return encodeBase32LowerCase(bytes);
}

const officeCharacters = [
	{ name: 'Michael Scott', username: 'michael-scott' },
	{ name: 'Dwight Schrute', username: 'dwight-schrute' },
	{ name: 'Jim Halpert', username: 'jim-halpert' },
	{ name: 'Pam Beesly', username: 'pam-beesly' },
	{ name: 'Ryan Howard', username: 'ryan-howard' },
	{ name: 'Andy Bernard', username: 'andy-bernard' },
	{ name: 'Angela Martin', username: 'angela-martin' },
	{ name: 'Kevin Malone', username: 'kevin-malone' },
	{ name: 'Oscar Martinez', username: 'oscar-martinez' },
	{ name: 'Stanley Hudson', username: 'stanley-hudson' },
	{ name: 'Phyllis Vance', username: 'phyllis-vance' },
	{ name: 'Meredith Palmer', username: 'meredith-palmer' },
	{ name: 'Creed Bratton', username: 'creed-bratton' },
	{ name: 'Kelly Kapoor', username: 'kelly-kapoor' },
	{ name: 'Toby Flenderson', username: 'toby-flenderson' },
	{ name: 'Darryl Philbin', username: 'darryl-philbin' },
	{ name: 'Erin Hannon', username: 'erin-hannon' },
	{ name: 'Gabe Lewis', username: 'gabe-lewis' },
	{ name: 'Holly Flax', username: 'holly-flax' },
	{ name: 'Jan Levinson', username: 'jan-levinson' }
];

async function seed() {
	console.log('Seeding The Office characters...');
	console.log('Password for all users: dundermifflin');
	console.log('');

	// Generate password hash using the same function as auth module
	const passwordHash = await hashPassword('dundermifflin');

	for (const character of officeCharacters) {
		const id = generateUserId();
		try {
			await db.insert(user).values({
				id,
				username: character.username,
				passwordHash
			});
			console.log(`Created user: ${character.name} (${character.username})`);
		} catch (e) {
			if ((e as { code?: string }).code === '23505') {
				console.log(`User already exists: ${character.name} (${character.username})`);
			} else {
				throw e;
			}
		}
	}

	console.log('');
	console.log('Done! You can now login as any character.');
	console.log('Example: michael-scott / dundermifflin');
}

seed().catch(console.error);
