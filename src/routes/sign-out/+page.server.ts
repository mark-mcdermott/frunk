import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import * as auth from '$lib/server/auth';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { isDemo } from '$lib/roles';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async (event) => {
		const user = event.locals.user;
		const session = event.locals.session;

		if (session) {
			await auth.invalidateSession(session.id);
			auth.deleteSessionTokenCookie(event);
		}

		// If this was a demo user, clean up all their data
		if (user && isDemo(user.roles)) {
			// Delete user (cascade will handle vehicles, repairs, notes, etc.)
			await db.delete(table.user).where(eq(table.user.uuid, user.uuid));
		}

		return redirect(302, '/');
	}
};
