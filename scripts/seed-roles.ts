import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { roles } from '../src/lib/server/db/schema';
import { ROLE_IDS } from '../src/lib/roles';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = neon(DATABASE_URL);
const db = drizzle(client);

const roleData = [
	{
		id: ROLE_IDS.DEMO,
		name: 'Demo',
		mutuallyExclusiveWith: [ROLE_IDS.USER, ROLE_IDS.ADMIN] // Demo users can't have User or Admin roles
	},
	{
		id: ROLE_IDS.USER,
		name: 'User',
		mutuallyExclusiveWith: [ROLE_IDS.DEMO] // Regular users can't be Demo
	},
	{
		id: ROLE_IDS.ADMIN,
		name: 'Admin',
		mutuallyExclusiveWith: [ROLE_IDS.DEMO] // Admins can't be Demo
	}
];

async function seedRoles() {
	console.log('Seeding roles table...\n');

	for (const role of roleData) {
		await db.insert(roles).values(role).onConflictDoNothing();
		console.log(`  Created role: ${role.name} (id: ${role.id})`);
	}

	console.log('\nRoles seeding complete!');
}

seedRoles().catch(console.error);
