import { eq } from 'drizzle-orm';
import { getDb } from '../../../lib/server/db';
import * as table from '../../../lib/server/db/schema';

/**
 * The server half of a WebAuthn ceremony's memory.
 *
 * Both ceremonies are two round trips: hand out a challenge, then verify a signature
 * over it. The signature only proves anything if the challenge was chosen by the
 * server and used once, so it is stored here rather than round-tripped through the
 * client, and reading it deletes it.
 */

const TTL_MS = 5 * 60 * 1000;

export type Ceremony = 'register' | 'login';

/** Namespaced so a challenge issued for signing up cannot be spent on signing in. */
const keyFor = (ceremony: Ceremony, username: string) => `${ceremony}:${username}`;

export interface PendingChallenge {
	challenge: string;
	/** The account a registration is destined for; null for a sign-in. */
	userId: string | null;
}

export async function storeChallenge(
	ceremony: Ceremony,
	username: string,
	challenge: string,
	userId: string | null = null
): Promise<void> {
	const key = keyFor(ceremony, username);
	const expiresAt = new Date(Date.now() + TTL_MS);

	await getDb()
		.insert(table.webauthnChallenges)
		.values({ key, challenge, userId, expiresAt })
		.onConflictDoUpdate({
			target: table.webauthnChallenges.key,
			set: { challenge, userId, expiresAt }
		});
}

/**
 * Reads and deletes in one statement. Single-use is the point: a challenge that
 * survived a failed verification could be replayed, and a stolen assertion could be
 * presented twice.
 */
export async function consumeChallenge(
	ceremony: Ceremony,
	username: string
): Promise<PendingChallenge | null> {
	const [row] = await getDb()
		.delete(table.webauthnChallenges)
		.where(eq(table.webauthnChallenges.key, keyFor(ceremony, username)))
		.returning({
			challenge: table.webauthnChallenges.challenge,
			userId: table.webauthnChallenges.userId,
			expiresAt: table.webauthnChallenges.expiresAt
		});

	if (!row || row.expiresAt.getTime() <= Date.now()) return null;
	return { challenge: row.challenge, userId: row.userId };
}
