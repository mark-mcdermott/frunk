import type { APIRoute } from 'astro';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '../../../lib/server/db';
import * as table from '../../../lib/server/db/schema';
import { ownedNote, requireSession } from '../_lib/guard';
import { handler, json, noContent, notFound, readJson } from '../_lib/http';
import { updateNoteSchema } from '../_lib/schemas';

export const prerender = false;

/** Notes nest one level: a note carries its children (`parent_note_id`). */
export const GET: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const uuid = context.params.uuid;
		if (!uuid) return notFound('Note not found');

		const note = await ownedNote(uuid, user.id);

		const children = await getDb()
			.select()
			.from(table.notes)
			.where(eq(table.notes.parentNoteId, uuid))
			.orderBy(table.notes.order, desc(table.notes.createdAt));

		return json({ note, children });
	});

export const PATCH: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const uuid = context.params.uuid;
		if (!uuid) return notFound('Note not found');

		await ownedNote(uuid, user.id);
		const body = await readJson(context.request, updateNoteSchema);

		const [note] = await getDb()
			.update(table.notes)
			.set({ ...body, updatedAt: new Date() })
			.where(eq(table.notes.uuid, uuid))
			.returning();

		return json({ note });
	});

export const DELETE: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const uuid = context.params.uuid;
		if (!uuid) return notFound('Note not found');

		await ownedNote(uuid, user.id);
		const db = getDb();

		/*
		 * `parent_note_id` references `notes.uuid` but carries no FK constraint, so
		 * children are not cascaded by the database. Delete them explicitly or they
		 * are orphaned — the SvelteKit `deleteChildNote` action left this to the UI.
		 */
		await db.delete(table.notes).where(eq(table.notes.parentNoteId, uuid));
		await db.delete(table.notes).where(eq(table.notes.uuid, uuid));

		return noContent();
	});
