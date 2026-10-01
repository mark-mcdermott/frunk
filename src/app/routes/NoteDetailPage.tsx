import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	ArrowLeft,
	Calendar,
	Car,
	FileText,
	Paperclip,
	Pencil,
	Trash2,
	Wrench
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { deleteNote, getNote, keys, listVehicles } from '../api';
import { useCrumbs } from '../AppShell';
import { formatDate } from '../format';
import { FileImage, FileLink } from '../files';

/**
 * The note detail, built to `docs/mocks/note-single.webp`.
 *
 * The screen's job is the attachment: the index and panels only say "Has attachment",
 * and this is where the receipt actually renders — inline for an image, a chip that
 * opens the file for a PDF, both through the ownership-checked `/api/files/*` route.
 *
 * Two mock fields are absent: "Created by" (single-user data — every note here is
 * yours) and the download-icon button (the attachment link opens the file; the browser
 * saves from there). Child notes render read-only when legacy data has them — the
 * schema nests one level, but nothing in this app creates nested notes yet.
 */

function Meta({
	icon,
	label,
	children
}: {
	icon: React.ReactNode;
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex items-center gap-3">
			<span aria-hidden className="text-text-faint">
				{icon}
			</span>
			<div>
				<p className="text-[0.6875rem] tracking-[0.12em] text-text-faint uppercase">{label}</p>
				<p className="mt-0.5 text-[0.875rem] text-text">{children}</p>
			</div>
		</div>
	);
}

export function NoteDetailPage() {
	const { uuid = '' } = useParams();
	const navigate = useNavigate();
	const client = useQueryClient();
	const [confirmingDelete, setConfirmingDelete] = useState(false);

	const { data, isPending, isError, error } = useQuery({
		queryKey: keys.note(uuid),
		queryFn: () => getNote(uuid)
	});
	const vehicles = useQuery({ queryKey: keys.vehicles, queryFn: listVehicles });

	const note = data?.note;
	useCrumbs(note ? [{ label: note.title }] : []);

	const remove = useMutation({
		mutationFn: () => deleteNote(uuid),
		onSuccess: () => {
			client.invalidateQueries({ queryKey: keys.notes });
			if (note?.vehicleId) client.invalidateQueries({ queryKey: keys.vehicle(note.vehicleId) });
			if (note?.repairId) client.invalidateQueries({ queryKey: keys.repair(note.repairId) });
			navigate('/notes');
		}
	});

	if (isPending) {
		return <p className="py-10 text-[0.9375rem] text-text-muted">Loading…</p>;
	}

	if (isError || !note) {
		return (
			<div className="py-10">
				<p role="alert" className="text-[0.9375rem] text-destructive">
					{error instanceof Error ? error.message : 'Note not found'}
				</p>
				<Link to="/notes" className="mt-4 inline-block text-[0.9375rem] text-accent-bright">
					Back to notes
				</Link>
			</div>
		);
	}

	const vehicle = note.vehicleId ? vehicles.data?.find((v) => v.id === note.vehicleId) : null;
	const isPdf = note.imageUrl?.toLowerCase().includes('.pdf');

	return (
		<>
			<Link
				to="/notes"
				className="inline-flex items-center gap-2 text-[0.9375rem] text-accent-bright transition-opacity hover:opacity-80"
			>
				<ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
				Back to notes
			</Link>

			<div className="card mt-6 max-w-3xl p-6 sm:p-8">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="flex min-w-0 items-center gap-4">
						<span
							aria-hidden
							className="flex size-12 shrink-0 items-center justify-center rounded-[12px] bg-accent/15"
						>
							<FileText className="size-5 text-accent-bright" strokeWidth={1.5} />
						</span>
						<h1 className="display min-w-0 text-[clamp(1.5rem,3vw,2.25rem)] break-words">
							{note.title}
						</h1>
					</div>

					<div className="flex shrink-0 items-center gap-3">
						<Link
							to={`/notes/${note.uuid}/edit`}
							className="flex items-center gap-2 rounded-full border border-accent/50 px-4 py-2 text-[0.875rem] text-text transition-colors hover:bg-accent/10"
						>
							<Pencil className="size-4 text-accent-bright" strokeWidth={1.75} aria-hidden />
							Edit
						</Link>
						{confirmingDelete ? (
							<>
								<button
									type="button"
									disabled={remove.isPending}
									onClick={() => remove.mutate()}
									className="rounded-full bg-destructive px-4 py-2 text-[0.875rem] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
								>
									{remove.isPending ? 'Deleting…' : 'Delete permanently'}
								</button>
								<button
									type="button"
									onClick={() => setConfirmingDelete(false)}
									className="text-[0.875rem] text-text-muted transition-colors hover:text-text"
								>
									Cancel
								</button>
							</>
						) : (
							<button
								type="button"
								onClick={() => setConfirmingDelete(true)}
								className="flex items-center gap-2 rounded-full border border-destructive/40 px-4 py-2 text-[0.875rem] text-destructive transition-colors hover:bg-destructive-bg"
							>
								<Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
								Delete
							</button>
						)}
					</div>
				</div>

				<div className="mt-6 flex flex-wrap gap-x-10 gap-y-4 rounded-control border border-border bg-surface-raised px-5 py-4">
					<Meta icon={<Calendar className="size-4" />} label="Date">
						{formatDate(note.createdAt)}
					</Meta>
					{vehicle && (
						<Meta icon={<Car className="size-4" />} label="Vehicle">
							<Link to={`/vehicles/${vehicle.id}`} className="text-accent-bright hover:opacity-80">
								{vehicle.nickname || `${vehicle.year} ${vehicle.make} ${vehicle.model}`}
							</Link>
						</Meta>
					)}
					{note.repairId && (
						<Meta icon={<Wrench className="size-4" />} label="Repair">
							<Link
								to={`/repairs/${note.repairId}`}
								className="text-accent-bright hover:opacity-80"
							>
								View repair
							</Link>
						</Meta>
					)}
					<Meta icon={<Paperclip className="size-4" />} label="Attachments">
						{note.imageUrl ? 1 : 0}
					</Meta>
				</div>

				{note.body && (
					<div className="mt-6">
						<p className="text-[0.75rem] tracking-[0.12em] text-text-faint uppercase">Note</p>
						<p className="mt-2 text-[0.9375rem] leading-relaxed whitespace-pre-wrap text-text">
							{note.body}
						</p>
					</div>
				)}

				{note.imageUrl && (
					<div className="mt-6">
						<p className="text-[0.75rem] tracking-[0.12em] text-text-faint uppercase">Attachment</p>
						{isPdf ? (
							<FileLink
								href={note.imageUrl}
								className="mt-3 inline-flex items-center gap-2 rounded-control border border-border bg-surface-raised px-4 py-3 text-[0.875rem] text-text transition-colors hover:border-border-strong"
							>
								<FileText className="size-4 text-accent-bright" strokeWidth={1.75} aria-hidden />
								Open the PDF
							</FileLink>
						) : (
							<FileLink href={note.imageUrl} className="mt-3 block">
								<FileImage
									src={note.imageUrl}
									alt={note.title}
									className="max-h-[28rem] rounded-control border border-border object-contain"
								/>
							</FileLink>
						)}
					</div>
				)}

				{data.children.length > 0 && (
					<div className="mt-8 border-t border-border pt-6">
						<p className="text-[0.75rem] tracking-[0.12em] text-text-faint uppercase">
							Nested notes
						</p>
						<div className="mt-3 flex flex-col gap-3">
							{data.children.map((child) => (
								<article
									key={child.uuid}
									className="rounded-control border border-border bg-surface-raised p-4"
								>
									<h3 className="text-[0.9375rem] font-semibold text-text">{child.title}</h3>
									{child.body && (
										<p className="mt-1 text-[0.875rem] text-text-muted">{child.body}</p>
									)}
								</article>
							))}
						</div>
					</div>
				)}
			</div>
		</>
	);
}
