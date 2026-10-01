import { Capacitor } from '@capacitor/core';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { ComponentProps, ReactNode } from 'react';
import { apiUrl, NATIVE } from '@/lib/platform';
import { authHeaders } from '@/lib/session-token';

/**
 * Files the API serves, on both builds.
 *
 * On the web an uploaded file is just a URL: `<img src="/api/files/…">` works because
 * the session cookie rides along. In the native bundle the same path is on another
 * origin and needs the bearer token, which an `<img>` or an `<a>` cannot send. So
 * anything under `/api/` is fetched with the token here and handed over as bytes — an
 * object URL for a picture, the share sheet for a document. Everything else (the
 * bundled `/samples/…`, an absolute URL) is used as it is.
 */
const needsToken = (url: string) => NATIVE && url.startsWith('/api/');

async function fetchFile(url: string): Promise<{ blob: Blob; name: string | null }> {
	const response = await fetch(apiUrl(url), { headers: authHeaders() });
	if (!response.ok) throw new Error('That file could not be loaded.');
	const named = /filename="([^"]+)"/.exec(response.headers.get('content-disposition') ?? '');
	return { blob: await response.blob(), name: named?.[1] ?? null };
}

/** The `src` to give an `<img>`: the URL itself on the web, an object URL in the app. */
export function useFileSrc(url: string | null | undefined): string | undefined {
	const managed = Boolean(url) && needsToken(url as string);
	const { data } = useQuery({
		queryKey: ['file-src', url],
		queryFn: async () => URL.createObjectURL((await fetchFile(url as string)).blob),
		enabled: managed,
		// The pathname carries a random suffix, so its content never changes.
		staleTime: Infinity,
		gcTime: Infinity,
		retry: false
	});
	if (!url) return undefined;
	return managed ? data : url;
}

/** An `<img>` for a stored file. `alt` is spelled out so it cannot be forgotten. */
export function FileImage({
	src,
	alt,
	...rest
}: Omit<ComponentProps<'img'>, 'src' | 'alt'> & { src: string; alt: string }) {
	return <img src={useFileSrc(src)} alt={alt} {...rest} />;
}

const toBase64 = (blob: Blob) =>
	new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
		reader.onerror = () => reject(new Error('That file could not be read.'));
		reader.readAsDataURL(blob);
	});

/**
 * Hands a fetched file to the system: on a device it is written to the cache and
 * offered through the share sheet (Quick Look, Save to Files, Print, AirDrop, Mail);
 * a bundle being rehearsed in a browser saves it as a download.
 */
async function present(url: string, filename: string | undefined): Promise<void> {
	const { blob, name } = await fetchFile(url);
	const path = filename ?? name ?? url.split('/').pop() ?? 'file';

	if (!Capacitor.isNativePlatform()) {
		const link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = path;
		link.click();
		URL.revokeObjectURL(link.href);
		return;
	}

	const [{ Filesystem, Directory }, { Share }] = await Promise.all([
		import('@capacitor/filesystem'),
		import('@capacitor/share')
	]);
	const written = await Filesystem.writeFile({
		path,
		data: await toBase64(blob),
		directory: Directory.Cache
	});
	await Share.share({ title: path, files: [written.uri] });
}

/**
 * A link to a stored file or a generated one (the history PDF, the CSV). On the web it
 * is an ordinary anchor — a new tab, or a download when `download` is set. In the app
 * it is a button that fetches the file with the token and opens the share sheet.
 */
export function FileLink({
	href,
	filename,
	download = false,
	className,
	children,
	'aria-label': label
}: {
	href: string;
	/** What to call the file; the server's `content-disposition` wins when it names one. */
	filename?: string;
	download?: boolean;
	className?: string;
	children: ReactNode;
	'aria-label'?: string;
}) {
	const open = useMutation({ mutationFn: () => present(href, filename) });

	if (!needsToken(href)) {
		return download ? (
			<a href={href} download={filename ?? true} className={className} aria-label={label}>
				{children}
			</a>
		) : (
			<a href={href} target="_blank" rel="noreferrer" className={className} aria-label={label}>
				{children}
			</a>
		);
	}

	return (
		<button
			type="button"
			disabled={open.isPending}
			aria-busy={open.isPending}
			aria-label={label}
			onClick={() => open.mutate()}
			className={`${className ?? ''} disabled:opacity-60`}
		>
			{children}
		</button>
	);
}
