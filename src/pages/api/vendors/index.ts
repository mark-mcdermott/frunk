import type { APIRoute } from 'astro';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '../../../lib/server/db';
import * as table from '../../../lib/server/db/schema';
import { requireSession } from '../_lib/guard';
import { handler, json, readJson } from '../_lib/http';
import { createVendorSchema } from '../_lib/schemas';

export const prerender = false;

export const GET: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);

		const vendors = await getDb()
			.select()
			.from(table.vendors)
			.where(eq(table.vendors.userId, user.uuid))
			.orderBy(desc(table.vendors.createdAt));

		return json({ vendors });
	});

export const POST: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);
		const body = await readJson(context.request, createVendorSchema);

		const [vendor] = await getDb()
			.insert(table.vendors)
			.values({ ...body, id: crypto.randomUUID(), userId: user.uuid })
			.returning();

		return json({ vendor }, 201);
	});
