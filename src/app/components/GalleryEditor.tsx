import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ImagePlus, Plus, Trash2, X } from 'lucide-react';
import { useId, useRef, useState, type SubmitEvent } from 'react';
import {
	createGallery,
	createPhoto,
	deleteGallery,
	deletePhoto,
	keys,
	uploadFile,
	type Gallery
} from '../api';
import { TextField } from './Field';
import { FileImage } from '../files';

/**
 * Galleries on the vehicle detail panel: create and delete galleries, add and remove
 * photos. Inline like the schedule editor, and for the same reason — a gallery is a
 * name attached to the vehicle already on screen.
 *
 * Adding a photo is two requests: the upload (which answers with the private serving
 * URL) and then `POST /api/photos` to hang that URL on the gallery. If the second
 * fails the blob is orphaned — same accepted trade as everywhere else uploads happen
 * before rows.
 *
 * Not here yet, deliberately: captions and drag-to-reorder (`photoOrder` PATCH), and
 * renaming a gallery. They ride together as a polish pass; none of them gates the
 * feature the way "photos cannot exist at all" did.
 */

function AddPhotoButton({ galleryId, vehicleId }: { galleryId: string; vehicleId: string }) {
	const client = useQueryClient();
	const input = useRef<HTMLInputElement>(null);

	const add = useMutation({
		mutationFn: async (file: File) => {
			const uploaded = await uploadFile(file);
			return createPhoto({ galleryId, imageUrl: uploaded.url });
		},
		onSuccess: () => client.invalidateQueries({ queryKey: keys.vehicle(vehicleId) })
	});

	return (
		<>
			<button
				type="button"
				disabled={add.isPending}
				onClick={() => input.current?.click()}
				className="flex h-28 w-full flex-col items-center justify-center gap-2 rounded-control border border-dashed border-border-strong text-[0.8125rem] text-text-muted transition-colors hover:border-accent-bright/60 hover:text-text disabled:opacity-60"
			>
				<ImagePlus className="size-5 text-accent-bright" strokeWidth={1.5} aria-hidden />
				{add.isPending ? 'Uploading…' : 'Add photo'}
			</button>
			<input
				ref={input}
				type="file"
				accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
				className="sr-only"
				aria-label="Add photo"
				onChange={(event) => {
					const file = event.target.files?.[0];
					if (file) add.mutate(file);
					event.target.value = '';
				}}
			/>
			{add.isError && (
				<p role="alert" className="col-span-full self-center text-[0.8125rem] text-destructive">
					{add.error instanceof Error ? add.error.message : 'Could not add that photo.'}
				</p>
			)}
		</>
	);
}

function GalleryBlock({ gallery, vehicleId }: { gallery: Gallery; vehicleId: string }) {
	const client = useQueryClient();
	const [confirming, setConfirming] = useState(false);
	const refresh = () => client.invalidateQueries({ queryKey: keys.vehicle(vehicleId) });
	const headingId = useId();

	const removeGallery = useMutation({ mutationFn: deleteGallery, onSuccess: refresh });
	const removePhoto = useMutation({ mutationFn: deletePhoto, onSuccess: refresh });

	return (
		<section aria-labelledby={headingId}>
			<div className="flex items-start justify-between gap-3">
				<div>
					<h3 id={headingId} className="text-[0.9375rem] font-semibold text-text">
						{gallery.name}
					</h3>
					{gallery.description && (
						<p className="mt-1 text-[0.8125rem] text-text-muted">{gallery.description}</p>
					)}
				</div>

				{confirming ? (
					<div className="flex shrink-0 items-center gap-2">
						<button
							type="button"
							disabled={removeGallery.isPending}
							onClick={() => removeGallery.mutate(gallery.id)}
							className="rounded-full bg-destructive px-3 py-1.5 text-[0.75rem] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
						>
							{removeGallery.isPending
								? 'Deleting…'
								: `Delete gallery and ${gallery.photos.length} photo${gallery.photos.length === 1 ? '' : 's'}`}
						</button>
						<button
							type="button"
							onClick={() => setConfirming(false)}
							className="text-[0.8125rem] text-text-muted transition-colors hover:text-text"
						>
							Cancel
						</button>
					</div>
				) : (
					<button
						type="button"
						aria-label={`Delete gallery ${gallery.name}`}
						onClick={() => setConfirming(true)}
						className="flex size-8 shrink-0 items-center justify-center rounded-full border border-destructive/40 text-destructive transition-colors hover:bg-destructive-bg"
					>
						<Trash2 className="size-3.5" strokeWidth={1.75} aria-hidden />
					</button>
				)}
			</div>

			<div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,11rem)] sm:gap-4">
				{gallery.photos.map((photo) => (
					<figure key={photo.id} className="group relative overflow-hidden rounded-control">
						<FileImage
							src={photo.imageUrl}
							alt={photo.caption ?? ''}
							className="h-28 w-full object-cover"
						/>
						{photo.caption && (
							<figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2 text-[0.75rem] text-white">
								{photo.caption}
							</figcaption>
						)}
						<button
							type="button"
							aria-label={`Delete photo${photo.caption ? ` ${photo.caption}` : ''}`}
							onClick={() => removePhoto.mutate(photo.id)}
							className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
						>
							<X className="size-3.5" strokeWidth={2} aria-hidden />
						</button>
					</figure>
				))}

				<AddPhotoButton galleryId={gallery.id} vehicleId={vehicleId} />
			</div>
		</section>
	);
}

export function GalleryEditor({
	vehicleId,
	galleries
}: {
	vehicleId: string;
	galleries: Gallery[];
}) {
	const client = useQueryClient();
	const [adding, setAdding] = useState(false);
	const [name, setName] = useState('');
	const [error, setError] = useState<string | null>(null);

	const add = useMutation({
		mutationFn: () => createGallery({ vehicleId, name: name.trim() }),
		onSuccess: () => {
			setAdding(false);
			setName('');
			client.invalidateQueries({ queryKey: keys.vehicle(vehicleId) });
		}
	});

	function submit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!name.trim()) {
			setError('Name is required');
			return;
		}
		setError(null);
		add.mutate();
	}

	return (
		<>
			{!adding && (
				<div className="mb-4 flex justify-end">
					<button
						type="button"
						onClick={() => setAdding(true)}
						className="flex items-center gap-1.5 rounded-full border border-accent/50 px-3 py-1.5 text-[0.8125rem] text-text transition-colors hover:bg-accent/10"
					>
						<Plus className="size-3.5 text-accent-bright" strokeWidth={2} aria-hidden />
						Add Gallery
					</button>
				</div>
			)}

			{adding && (
				<form
					onSubmit={submit}
					noValidate
					className="mb-6 rounded-control border border-border bg-surface-raised p-4"
				>
					<div className="max-w-sm">
						<TextField
							id="gallery-name"
							label="Gallery name"
							placeholder="Exterior"
							error={error ?? undefined}
							value={name}
							onChange={setName}
						/>
					</div>
					<div className="mt-4 flex items-center gap-3">
						<button
							type="submit"
							disabled={add.isPending}
							className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-[0.875rem] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
						>
							<Check className="size-3.5" strokeWidth={2} aria-hidden />
							{add.isPending ? 'Creating…' : 'Create gallery'}
						</button>
						<button
							type="button"
							onClick={() => setAdding(false)}
							className="text-[0.875rem] text-text-muted transition-colors hover:text-text"
						>
							Cancel
						</button>
					</div>
					{add.isError && (
						<p role="alert" className="mt-3 text-[0.8125rem] text-destructive">
							{add.error instanceof Error ? add.error.message : 'Could not create the gallery.'}
						</p>
					)}
				</form>
			)}

			{galleries.length === 0 && !adding ? (
				<div className="flex flex-col items-center gap-3 py-10 text-center">
					<span
						aria-hidden
						className="flex size-12 items-center justify-center rounded-full bg-accent/10 text-accent-bright"
					>
						<ImagePlus className="size-5" strokeWidth={1.5} />
					</span>
					<h3 className="display-sm text-lg">No galleries yet</h3>
					<p className="max-w-xs text-[0.875rem] text-text-muted">
						Group photos by exterior, interior or details.
					</p>
				</div>
			) : (
				<div className="grid gap-8 md:grid-cols-2">
					{galleries.map((gallery) => (
						<GalleryBlock key={gallery.id} gallery={gallery} vehicleId={vehicleId} />
					))}
				</div>
			)}
		</>
	);
}
