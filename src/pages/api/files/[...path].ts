import type { APIRoute } from 'astro';
import { getUserFile } from '../../../lib/server/files';
import { requireSession } from '../_lib/guard';
import { handler, notFound } from '../_lib/http';

export const prerender = false;

/**
 * Serves a private blob back to its owner.
 *
 * The ownership check is the pathname prefix: everything is stored under
 * `u/<userId>/`, so a session either matches the prefix or the file does not exist
 * for them — same no-existence-oracle rule as every other route (a foreign file is a
 * 404, not a 403).
 *
 * Cache-Control is `private, immutable`: the random suffix in every pathname means a
 * given URL's content can never change, so the browser may keep it for a year, but
 * only in the browser — `private` keeps it out of any shared cache, which is the
 * whole point of a private store.
 */
export const GET: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);

		const pathname = context.params.path;
		if (!pathname || !pathname.startsWith(`u/${user.id}/`)) {
			return notFound('File not found');
		}

		const file = await getUserFile(pathname);
		if (!file) return notFound('File not found');

		return new Response(file.stream, {
			status: 200,
			headers: {
				'content-type': file.blob.contentType ?? 'application/octet-stream',
				'content-length': String(file.blob.size),
				'cache-control': 'private, max-age=31536000, immutable',
				'content-disposition': 'inline'
			}
		});
	});
