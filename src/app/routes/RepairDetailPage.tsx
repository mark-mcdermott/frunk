import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	ArrowLeft,
	Calendar,
	DollarSign,
	FileText,
	Gauge,
	Paperclip,
	Pencil,
	Plus,
	Store,
	Trash2,
	Wrench
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { deleteNote, getRepair, keys, listVehicles, listVendors, type NoteDetail } from '../api';
import { useCrumbs } from '../AppShell';
import { formatCost, formatDate, formatMiles } from '../format';

/**
 * The repair detail, built to `docs/mocks/repair-single.webp`.
 *
 * Its reason to exist: **repair-attached notes surface nowhere else.** The notes index
 * only lists vehicle-attached notes (that is what its endpoint joins), so a receipt
 * hung on a repair was invisible until this screen. `+ Add Note` passes `?repair=<id>`
 * so the form attaches without asking.
 *
 * Vendor and vehicle names are joined **client-side from the cached lists** — the
 * endpoint returns the raw row, and both lists are already in the cache for anyone
 * arriving from inside the app.
 *
 * Two mock panels are absent: Attachments (a repair has no attachment model — its
 * attachments *are* its notes' files, shown on the note cards) and Repair History
 * (the vehicle's other repairs, which the vehicle screen already lists in full).
 */

function SpecRow({
	icon,
	label,
	children
}: {
	icon: ReactNode;
	label: string;
	children: ReactNode;
}) {
	return (
		<div className="flex items-center gap-4 border-b border-border py-4 last:border-b-0">
			<span aria-hidden className="text-text-faint">
				{icon}
			</span>
			<div>
				<p className="text-[0.75rem] tracking-[0.12em] text-text-faint uppercase">{label}</p>
				<p className="mt-1 text-[0.9375rem] text-text">{children}</p>
			</div>
		</div>
	);
}

function NoteCard({ note, onDelete }: { note: NoteDetail; onDelete: () => void }) {
	return (
		<article className="rounded-control border border-border bg-surface-raised p-4">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<h3 className="truncate text-[0.9375rem] font-semibold text-text">
						<Link to={`/notes/${note.uuid}`} className="transition-opacity hover:opacity-80">
							{note.title}
						</Link>
					</h3>
					<p className="mt-0.5 text-[0.75rem] text-text-faint">{formatDate(note.createdAt)}</p>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<Link
						to={`/notes/${note.uuid}/edit`}
						aria-label={`Edit ${note.title}`}
						className="flex size-8 items-center justify-center rounded-full border border-border text-text-muted transition-colors hover:border-text-muted hover:text-text"
					>
						<Pencil className="size-3.5" strokeWidth={1.75} aria-hidden />
					</Link>
					<button
						type="button"
						aria-label={`Delete ${note.title}`}
						onClick={onDelete}
						className="flex size-8 items-center justify-center rounded-full border border-destructive/40 text-destructive transition-colors hover:bg-destructive-bg"
					>
						<Trash2 className="size-3.5" strokeWidth={1.75} aria-hidden />
					</button>
				</div>
			</div>
			{note.body && <p className="mt-2 text-[0.875rem] text-text-muted">{note.body}</p>}
			{note.imageUrl && (
				<a
					href={note.imageUrl}
					target="_blank"
					rel="noreferrer"
					className="mt-3 flex items-center gap-2 text-[0.8125rem] text-accent-bright transition-opacity hover:opacity-80"
				>
					<Paperclip className="size-3.5" strokeWidth={1.75} aria-hidden />
					View attachment
				</a>
			)}
		</article>
	);
}

export function RepairDetailPage() {
	const { id = '' } = useParams();
	const client = useQueryClient();

	const { data, isPending, isError, error } = useQuery({
		queryKey: keys.repair(id),
		queryFn: () => getRepair(id)
	});
	const vehicles = useQuery({ queryKey: keys.vehicles, queryFn: listVehicles });
	const vendors = useQuery({ queryKey: keys.vendors, queryFn: listVendors });

	const repair = data?.repair;
	useCrumbs(repair ? [{ label: repair.description }] : []);

	const removeNote = useMutation({
		mutationFn: deleteNote,
		onSuccess: () => {
			client.invalidateQueries({ queryKey: keys.repair(id) });
			client.invalidateQueries({ queryKey: keys.notes });
		}
	});

	if (isPending) {
		return <p className="py-10 text-[0.9375rem] text-text-muted">Loading…</p>;
	}

	if (isError || !repair) {
		return (
			<div className="py-10">
				<p role="alert" className="text-[0.9375rem] text-destructive">
					{error instanceof Error ? error.message : 'Repair not found'}
				</p>
				<Link to="/repairs" className="mt-4 inline-block text-[0.9375rem] text-accent-bright">
					Back to repairs
				</Link>
			</div>
		);
	}

	const vehicle = vehicles.data?.find((v) => v.id === repair.vehicleId);
	const vendor = vendors.data?.find((v) => v.id === repair.vendorId);

	return (
		<>
			<Link
				to={`/vehicles/${repair.vehicleId}`}
				className="inline-flex items-center gap-2 text-[0.9375rem] text-accent-bright transition-opacity hover:opacity-80"
			>
				<ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
				Back to vehicle
			</Link>

			<div className="mt-6 flex flex-wrap items-start justify-between gap-6">
				<div className="flex items-center gap-4">
					<span
						aria-hidden
						className="flex size-14 shrink-0 items-center justify-center rounded-[14px] bg-accent/15"
					>
						<Wrench className="size-6 text-accent-bright" strokeWidth={1.5} />
					</span>
					<div>
						<h1 className="display text-[clamp(1.75rem,3.5vw,2.5rem)]">{repair.description}</h1>
						{repair.status === 'completed' && (
							<span className="mt-2 inline-block rounded-full bg-positive-bg px-2.5 py-1 text-[0.6875rem] font-medium text-positive">
								Completed
							</span>
						)}
					</div>
				</div>

				<Link
					to={`/repairs/${repair.id}/edit`}
					className="flex items-center gap-2 rounded-full border border-accent/50 px-4 py-2.5 text-[0.875rem] text-text transition-colors hover:bg-accent/10"
				>
					<Pencil className="size-4 text-accent-bright" strokeWidth={1.75} aria-hidden />
					Edit
				</Link>
			</div>

			<div className="mt-8 grid gap-6 lg:grid-cols-2">
				<section className="card px-6 py-2">
					<SpecRow icon={<Calendar className="size-4" />} label="Date">
						{formatDate(repair.date)}
					</SpecRow>
					{repair.mileage != null && (
						<SpecRow icon={<Gauge className="size-4" />} label="Mileage">
							{formatMiles(repair.mileage)}
						</SpecRow>
					)}
					{repair.cost != null && (
						<SpecRow icon={<DollarSign className="size-4" />} label="Cost">
							<span className="font-semibold text-positive">{formatCost(repair.cost)}</span>
						</SpecRow>
					)}
					{vendor && (
						<SpecRow icon={<Store className="size-4" />} label="Vendor">
							<Link
								to={`/vendors/${vendor.id}/edit`}
								className="text-accent-bright hover:opacity-80"
							>
								{vendor.name}
							</Link>
						</SpecRow>
					)}
					{vehicle && (
						<SpecRow icon={<Wrench className="size-4" />} label="Vehicle">
							<Link to={`/vehicles/${vehicle.id}`} className="text-accent-bright hover:opacity-80">
								{vehicle.nickname || `${vehicle.year} ${vehicle.make} ${vehicle.model}`}
							</Link>
						</SpecRow>
					)}
				</section>

				<section className="card p-6">
					<div className="flex items-center justify-between gap-3">
						<h2 className="display-sm flex items-center gap-3 text-xl">
							<FileText className="size-5 text-text-muted" aria-hidden />
							Notes
						</h2>
						<Link
							to={`/notes/new?repair=${repair.id}`}
							className="flex shrink-0 items-center gap-1.5 rounded-full border border-accent/50 px-3 py-1.5 text-[0.8125rem] text-text transition-colors hover:bg-accent/10"
						>
							<Plus className="size-3.5 text-accent-bright" strokeWidth={2} aria-hidden />
							Add Note
						</Link>
					</div>

					<div className="mt-6">
						{data.notes.length === 0 ? (
							<p className="py-6 text-center text-[0.875rem] text-text-muted">
								Receipts and details for this repair live here.
							</p>
						) : (
							<div className="flex flex-col gap-4">
								{data.notes.map((note) => (
									<NoteCard
										key={note.uuid}
										note={note}
										onDelete={() => removeNote.mutate(note.uuid)}
									/>
								))}
							</div>
						)}
					</div>
				</section>
			</div>
		</>
	);
}
