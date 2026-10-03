import { useMutation } from '@tanstack/react-query';
import { FileText, Trash2, Upload } from 'lucide-react';
import { useId, useRef } from 'react';
import { uploadFile } from '../api';
import { FileImage, FileLink } from '../files';

/**
 * Upload one file and hand its serving URL to the parent form, built to the
 * Cover Image block in `docs/mocks/vehicle-edit.webp`.
 *
 * The file goes to Blob the moment it is picked, not on form submit — the form then
 * saves a URL like any other field. The cost of that choice: a picked-then-abandoned
 * upload leaves an orphan blob, which is accepted and recorded in the plan (the
 * alternative, holding the bytes in memory until submit, breaks the moment a form
 * has a second reader of the URL, like a live preview).
 *
 * A PDF cannot preview in an `<img>`, so non-images get a file chip instead — the
 * link opens through `/api/files/*`, which the session cookie authenticates.
 */

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/avif,application/pdf';

export function FileField({
	anchor,
	label,
	value,
	onChange,
	imagesOnly = false
}: {
	/** An id for the whole field, so a link can land on it (`/vehicles/:id/edit#image`). */
	anchor?: string;
	label: string;
	/** The stored serving URL, or null when nothing is attached. */
	value: string | null;
	onChange: (url: string | null) => void;
	imagesOnly?: boolean;
}) {
	const id = useId();
	const input = useRef<HTMLInputElement>(null);

	const upload = useMutation({
		mutationFn: uploadFile,
		onSuccess: (file) => onChange(file.url)
	});

	const isPdf = value?.toLowerCase().includes('.pdf');

	return (
		<div id={anchor} className="flex scroll-mt-6 flex-col gap-2">
			<span className="text-[0.8125rem] font-medium text-text">
				{label} <span className="font-normal text-text-muted">(optional)</span>
			</span>

			<div className="flex flex-wrap items-center gap-4">
				{value &&
					(isPdf ? (
						<FileLink
							href={value}
							className="flex items-center gap-2 rounded-control border border-border bg-surface-raised px-4 py-3 text-[0.875rem] text-text transition-colors hover:border-border-strong"
						>
							<FileText className="size-4 text-accent-bright" strokeWidth={1.75} aria-hidden />
							View attachment
						</FileLink>
					) : (
						<FileImage
							src={value}
							alt=""
							className="h-24 w-36 rounded-control border border-border object-cover"
						/>
					))}

				<div className="flex items-center gap-3">
					<button
						type="button"
						disabled={upload.isPending}
						onClick={() => input.current?.click()}
						className="flex items-center gap-2 rounded-control border border-accent/50 px-4 py-2.5 text-[0.875rem] text-text transition-colors hover:bg-accent/10 disabled:opacity-60"
					>
						<Upload className="size-4 text-accent-bright" strokeWidth={1.75} aria-hidden />
						{upload.isPending ? 'Uploading…' : value ? 'Change' : 'Upload'}
					</button>

					{value && (
						<button
							type="button"
							onClick={() => onChange(null)}
							className="flex items-center gap-2 rounded-control border border-destructive/40 px-4 py-2.5 text-[0.875rem] text-destructive transition-colors hover:bg-destructive-bg"
						>
							<Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
							Remove
						</button>
					)}
				</div>
			</div>

			<input
				ref={input}
				id={id}
				type="file"
				accept={imagesOnly ? ACCEPT.replace(',application/pdf', '') : ACCEPT}
				className="sr-only"
				aria-label={label}
				onChange={(event) => {
					const file = event.target.files?.[0];
					if (file) upload.mutate(file);
					event.target.value = '';
				}}
			/>

			{upload.isError ? (
				<p role="alert" className="text-[0.8125rem] text-destructive">
					{upload.error instanceof Error ? upload.error.message : 'Upload failed.'}
				</p>
			) : (
				<p className="text-[0.8125rem] text-text-muted">
					{imagesOnly ? 'JPG, PNG, WebP or GIF' : 'PDF, JPG, PNG, WebP or GIF'} up to 10 MB.
				</p>
			)}
		</div>
	);
}
