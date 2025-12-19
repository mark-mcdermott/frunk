import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw redirect(302, '/sign-in');
	}

	// Get the note
	const [note] = await db
		.select()
		.from(table.notes)
		.where(eq(table.notes.uuid, params.noteId));

	if (!note) {
		throw error(404, 'Note not found');
	}

	// Get the vehicle and verify ownership
	const [vehicle] = await db
		.select()
		.from(table.vehicles)
		.where(eq(table.vehicles.id, note.vehicleId!));

	if (!vehicle) {
		throw error(404, 'Vehicle not found');
	}

	if (vehicle.userId !== locals.user.uuid) {
		throw error(403, 'Forbidden');
	}

	return { note, vehicle };
};
