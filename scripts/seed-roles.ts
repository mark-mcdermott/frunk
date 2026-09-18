import { roles } from '../src/lib/server/db/schema';
import { ROLE_IDS } from '../src/lib/roles';
import { describeTarget, scriptDb } from './db';

/**
 * Seeds the three roles. `ROLE_IDS` in `src/lib/roles.ts` hardcodes these ids, so
 * every deployment needs this run once — including the new blank Neon database the
 * port points at. Idempotent: re-running is a no-op.
 */

const db = scriptDb();

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
	console.log(`Seeding roles into ${describeTarget()}...\n`);

	for (const role of roleData) {
		await db.insert(roles).values(role).onConflictDoNothing();
		console.log(`  Created role: ${role.name} (id: ${role.id})`);
	}

	console.log('\nRoles seeding complete!');
}

seedRoles().catch((cause) => {
	console.error(cause);
	process.exitCode = 1;
});
