import type { APIRoute } from 'astro';
import {
	ALLOWED_TYPES,
	deleteManagedFiles,
	managedPathname,
	MAX_FILE_BYTES,
	putUserFile
} from '../../lib/server/files';
import { requireSession } from './_lib/guard';
import { fail, handler, json, noContent, notFound } from './_lib/http';

export const prerender = false;

/**
 * `POST /api/uploads?filename=receipt.pdf` with the raw file as the body.
 *
 * Raw body rather than multipart: one file per request is all the UI ever sends, and
 * `request.arrayBuffer()` + the `content-type` header carry everything multipart
 * would, without a parser. Returns `{ url }` — the app-relative serving path the
 * caller stores in its `image` / `imageUrl` column.
 *
 * The declared `content-length` is checked before the body is read, and the real
 * length after — the header is client-supplied, so it is a fast reject, not the
 * enforcement.
 */
export const POST: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);

		const filename = context.url.searchParams.get('filename');
		if (!filename) return fail(400, 'Pass ?filename=');

		const contentType = context.request.headers.get('content-type') ?? '';
		if (!(contentType in ALLOWED_TYPES)) {
			return fail(415, 'Only JPG, PNG, WebP, GIF, AVIF or PDF files are accepted');
		}

		const declared = Number(context.request.headers.get('content-length') ?? '0');
		if (declared > MAX_FILE_BYTES) return fail(413, 'Files can be up to 10 MB');

		const body = await context.request.arrayBuffer();
		if (body.byteLength === 0) return fail(400, 'The file is empty');
		if (body.byteLength > MAX_FILE_BYTES) return fail(413, 'Files can be up to 10 MB');

		try {
			const file = await putUserFile(user.id, filename, body, contentType);
			return json(file, 201);
		} catch (cause) {
			console.error('Upload failed:', cause);
			return fail(503, 'File storage is not available right now');
		}
	});

/**
 * `DELETE /api/uploads?url=/api/files/u/<id>/…` removes one of the caller's own
 * files. It exists for the avatar, whose column is written through Better Auth's
 * endpoint — the entity routes clean their own blobs server-side, but that path
 * cannot, so the client asks for the cleanup after the profile save lands. The
 * prefix check makes a foreign pathname a 404, same rule as serving.
 */
export const DELETE: APIRoute = (context) =>
	handler(async () => {
		const { user } = await requireSession(context);

		const pathname = managedPathname(context.url.searchParams.get('url'));
		if (!pathname || !pathname.startsWith(`u/${user.id}/`)) return notFound('File not found');

		await deleteManagedFiles([`/api/files/${pathname}`]);
		return noContent();
	});
