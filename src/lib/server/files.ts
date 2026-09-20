import { del, get, put } from '@vercel/blob';
import { BLOB_READ_WRITE_TOKEN } from 'astro:env/server';

/**
 * File storage: Vercel Blob, one **private** store (`frunk-uploads`).
 *
 * Private is the point (PORT-PLAN, Phase 4): the legacy R2 setup served every document
 * from a public `r2.dev` URL, so any leaked link was world-readable forever. Here a
 * blob is only reachable through `GET /api/files/*`, which checks the session and the
 * ownership prefix on every request.
 *
 * **The database never stores a blob URL.** It stores the app-relative serving path
 * (`/api/files/u/<userId>/…`), so `<img src>` works unchanged, external URLs (the
 * seeded R2 images) keep rendering, and the store could be swapped without a data
 * migration. `u/<userId>/` is the ownership boundary — user ids survive demo→real
 * conversion (Decision 5), so the prefix is stable for the life of the account.
 */

export const FILES_ROUTE = '/api/files/';

/** 10 MB, matching the limit the mocks advertise ("PDF, JPG, PNG up to 10MB"). */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** What the app accepts. Images render inline; PDF covers receipts and titles. */
export const ALLOWED_TYPES: Record<string, string> = {
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/webp': '.webp',
	'image/gif': '.gif',
	'image/avif': '.avif',
	'application/pdf': '.pdf'
};

function requireToken(): string {
	if (!BLOB_READ_WRITE_TOKEN) {
		throw new Error('BLOB_READ_WRITE_TOKEN is not set — file storage is not configured');
	}
	return BLOB_READ_WRITE_TOKEN;
}

/** Basename only, conservative characters, bounded length — it ends up in a header. */
function sanitizeFilename(name: string): string {
	const base = name.split(/[\\/]/).pop() ?? 'file';
	const clean = base
		.replace(/[^\w.-]+/g, '_')
		.replace(/^\.+/, '')
		.slice(0, 100);
	return clean || 'file';
}

export async function putUserFile(
	userId: string,
	filename: string,
	body: ArrayBuffer,
	contentType: string
): Promise<{ url: string; pathname: string }> {
	const blob = await put(`u/${userId}/${sanitizeFilename(filename)}`, body, {
		access: 'private',
		contentType,
		// The suffix is what lets two receipts both be "receipt.pdf", and what makes
		// the serving URL immutable enough to cache hard.
		addRandomSuffix: true,
		token: requireToken()
	});

	return { url: `${FILES_ROUTE}${blob.pathname}`, pathname: blob.pathname };
}

export function getUserFile(pathname: string) {
	return get(pathname, { access: 'private', token: requireToken() });
}

/** The blob pathname behind a stored URL, or null when the URL is not ours (R2, absolute). */
export function managedPathname(url: string | null | undefined): string | null {
	return url?.startsWith(FILES_ROUTE) ? url.slice(FILES_ROUTE.length) : null;
}

/**
 * Best-effort blob cleanup after rows are gone. A failure here must not fail the
 * request — the row deletion already happened and is the part the user asked for —
 * so it is logged and the orphan is left for a reconciliation pass.
 */
export async function deleteManagedFiles(urls: Array<string | null | undefined>): Promise<void> {
	const pathnames = urls.map(managedPathname).filter((p): p is string => p !== null);
	if (pathnames.length === 0) return;

	try {
		await del(pathnames, { token: requireToken() });
	} catch (cause) {
		console.error('Blob cleanup failed (rows already deleted):', pathnames, cause);
	}
}
