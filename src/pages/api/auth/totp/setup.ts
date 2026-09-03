import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { assertProductionSecrets, relyingParty } from '../../../../lib/server/auth/relying-party';
import { sealSecret } from '../../../../lib/server/auth/secrets';
import { generateTotpSecret, totpAuthUri } from '../../../../lib/server/auth/totp';
import { getDb } from '../../../../lib/server/db';
import * as table from '../../../../lib/server/db/schema';
import { requireSession } from '../../_lib/guard';
import { fail, handler, json } from '../../_lib/http';

export const prerender = false;

/**
 * Mint a recovery secret and store it as pending. Signed in only.
 *
 * The plaintext secret leaves the server exactly once, here, because an authenticator
 * app has to be given it; only the sealed form is written down. It is not usable until
 * `enable` has seen a code derived from it, so a setup abandoned halfway cannot lock
 * anyone out of anything.
 *
 * A setup that is already enabled is refused rather than replaced: overwriting would
 * clear `totpEnabled` too, so walking away from the new QR code would silently destroy
 * a recovery method that was working a moment ago.
 */
export const POST: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		assertProductionSecrets(relyingParty(context.url));

		const db = getDb();
		const [current] = await db
			.select({ totpEnabled: table.user.totpEnabled })
			.from(table.user)
			.where(eq(table.user.uuid, user.uuid));

		if (current?.totpEnabled) {
			return fail(409, 'Recovery is already set up. Turn it off before setting up a new code.');
		}

		const secret = generateTotpSecret();
		await db
			.update(table.user)
			.set({ totpSecret: sealSecret(secret), totpEnabled: false })
			.where(eq(table.user.uuid, user.uuid));

		return json({ uri: totpAuthUri(user.username, secret), secret });
	});
