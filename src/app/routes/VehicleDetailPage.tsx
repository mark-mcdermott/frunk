import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	Calendar,
	Camera,
	Car,
	Check,
	Clock,
	Cog,
	Copy,
	FileDown,
	FileText,
	Gauge,
	Hash,
	Palette,
	Paperclip,
	Pencil,
	Plus,
	Table2,
	Trash2,
	Wrench
} from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import {
	deleteNote,
	deleteRepair,
	getVehicle,
	keys,
	type Note,
	type Repair,
	type Vehicle
} from '../api';
import { useCrumbs } from '../AppShell';
import { assessExpirations, describeDeadline } from '@/lib/maintenance';
import { DuePill } from '../components/DuePill';
import { GalleryEditor } from '../components/GalleryEditor';
import { ScheduleEditor } from '../components/ScheduleEditor';
import { formatCost, formatDate, formatMiles, formatNumericDate } from '../format';

/**
 * The vehicle detail screen, built to `docs/mocks/vehicle-single.webp`.
 *
 * `GET /api/vehicles/:id` answers the whole screen in one request, so this is one
 * query — notes, repairs, galleries and schedules come back with the vehicle.
 *
 * Notes and Repairs carry their `+ Add` button and per-row edit and delete, now that
 * those screens exist. Each `+ Add` passes `?vehicle=<id>` so the form arrives already
 * attached and never asks which vehicle you meant.
 *
 * Maintenance schedules and galleries are edited in place (`ScheduleEditor`,
 * `GalleryEditor`) — each is a small record attached to the vehicle already on screen.
 */

function Panel({
	icon,
	title,
	addTo,
	addLabel,
	children
}: {
	icon: ReactNode;
	title: string;
	addTo?: string;
	addLabel?: string;
	children: ReactNode;
}) {
	// Named by its heading, each panel is a landmark a screen reader (and a test) can address.
	const headingId = useId();
	return (
		<section aria-labelledby={headingId} className="card p-6">
			<div className="flex items-center justify-between gap-3">
				<h2 id={headingId} className="display-sm flex items-center gap-3 text-xl">
					<span aria-hidden className="text-text-muted">
						{icon}
					</span>
					{title}
				</h2>

				{addTo && (
					<Link
						to={addTo}
						className="flex shrink-0 items-center gap-1.5 rounded-full border border-accent/50 px-3 py-1.5 text-[0.8125rem] text-text transition-colors hover:bg-accent/10"
					>
						<Plus className="size-3.5 text-accent-bright" strokeWidth={2} aria-hidden />
						{addLabel}
					</Link>
				)}
			</div>
			<div className="mt-6">{children}</div>
		</section>
	);
}

/** Edit and delete, revealed on hover on a nested card. */
function RowActions({
	editTo,
	onDelete,
	label
}: {
	editTo: string;
	onDelete: () => void;
	label: string;
}) {
	return (
		<div className="flex shrink-0 items-center gap-2">
			<Link
				to={editTo}
				aria-label={`Edit ${label}`}
				className="flex size-8 items-center justify-center rounded-full border border-border text-text-muted transition-colors hover:border-text-muted hover:text-text"
			>
				<Pencil className="size-3.5" strokeWidth={1.75} aria-hidden />
			</Link>
			<button
				type="button"
				aria-label={`Delete ${label}`}
				onClick={onDelete}
				className="flex size-8 items-center justify-center rounded-full border border-destructive/40 text-destructive transition-colors hover:bg-destructive-bg"
			>
				<Trash2 className="size-3.5" strokeWidth={1.75} aria-hidden />
			</button>
		</div>
	);
}

/** Centred icon in a soft violet glow, serif title, one muted line (DESIGN.md §5). */
function Empty({ icon, title, line }: { icon: ReactNode; title: string; line: string }) {
	return (
		<div className="flex flex-col items-center gap-3 py-10 text-center">
			<span
				aria-hidden
				className="flex size-12 items-center justify-center rounded-full bg-accent/10 text-accent-bright"
			>
				{icon}
			</span>
			<h3 className="display-sm text-lg">{title}</h3>
			<p className="max-w-xs text-[0.875rem] text-text-muted">{line}</p>
		</div>
	);
}

/** Icon + muted label left, value right, one per line, no dividers (DESIGN.md §5). */
function SpecRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-4 py-2">
			<span className="flex items-center gap-3 text-[0.875rem] text-text-muted">
				<span aria-hidden className="text-text-faint">
					{icon}
				</span>
				{label}
			</span>
			<span className="text-right text-[0.875rem] font-medium text-text">{value}</span>
		</div>
	);
}

/**
 * The vehicle's dated renewals with the same verdict pills as its schedules. A car
 * with no dates gets a nudge rather than an empty list — the dates are what turn the
 * form's registration and insurance fields into reminders.
 */
function Renewals({ vehicle }: { vehicle: Vehicle }) {
	const headingId = useId();
	const renewals = assessExpirations(vehicle);

	return (
		<section aria-labelledby={headingId} className="mt-6 border-t border-border pt-5">
			<h2 id={headingId} className="text-[0.75rem] tracking-[0.12em] text-text-faint uppercase">
				Renewals
			</h2>
			{renewals.length === 0 ? (
				<p className="mt-3 text-[0.8125rem] text-text-muted">
					No renewal dates yet. Add registration, inspection and insurance dates when editing and
					they join your reminders.
				</p>
			) : (
				<ul className="mt-3 flex flex-col gap-3">
					{renewals.map(({ expiration, expiresOn, assessment }) => (
						<li key={expiration.kind} className="flex items-center justify-between gap-3">
							<div className="min-w-0">
								<p className="text-[0.875rem] text-text">{expiration.label}</p>
								<p className="text-[0.75rem] text-text-faint">
									{formatDate(expiresOn.toISOString())}
									{expiration.kind === 'insurance' && vehicle.insuranceProvider
										? ` · ${vehicle.insuranceProvider}`
										: ''}
								</p>
							</div>
							<DuePill assessment={assessment}>{describeDeadline(assessment)}</DuePill>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

function CopyVin({ vin }: { vin: string }) {
	const [copied, setCopied] = useState(false);

	return (
		<button
			type="button"
			onClick={() => {
				navigator.clipboard.writeText(vin).then(() => {
					setCopied(true);
					setTimeout(() => setCopied(false), 1500);
				});
			}}
			className="inline-flex items-center gap-2 rounded-control border border-border bg-surface-raised px-3 py-2 text-[0.8125rem] text-text-muted transition-colors hover:border-border-strong hover:text-text"
		>
			VIN: <span className="text-text">{vin}</span>
			{copied ? (
				<Check className="size-3.5 text-positive" strokeWidth={2} aria-hidden />
			) : (
				<Copy className="size-3.5" strokeWidth={1.75} aria-hidden />
			)}
			<span className="sr-only">{copied ? 'VIN copied' : 'Copy VIN'}</span>
		</button>
	);
}

function NoteCard({ note, onDelete }: { note: Note; onDelete: () => void }) {
	return (
		<article className="rounded-control border border-border bg-surface-raised p-4">
			<div className="flex items-start justify-between gap-3">
				<h3 className="text-[0.9375rem] font-semibold text-text">
					<Link to={`/notes/${note.uuid}`} className="transition-opacity hover:opacity-80">
						{note.title}
					</Link>
				</h3>
				<RowActions label={note.title} editTo={`/notes/${note.uuid}/edit`} onDelete={onDelete} />
			</div>
			{note.body && <p className="mt-2 text-[0.875rem] text-text-muted">{note.body}</p>}
			{note.imageUrl && (
				<p className="mt-3 flex items-center gap-2 text-[0.8125rem] text-text-faint">
					<FileText className="size-3.5" strokeWidth={1.75} aria-hidden />
					Has attachment
				</p>
			)}
		</article>
	);
}

function RepairCard({ repair, onDelete }: { repair: Repair; onDelete: () => void }) {
	return (
		<article className="rounded-control border border-border bg-surface-raised p-4">
			<div className="flex items-start justify-between gap-3">
				<h3 className="text-[0.9375rem] font-semibold text-text">
					<Link to={`/repairs/${repair.id}`} className="transition-opacity hover:opacity-80">
						{repair.description}
					</Link>
				</h3>
				{repair.status === 'completed' && (
					<span className="shrink-0 rounded-full bg-positive-bg px-2.5 py-1 text-[0.6875rem] font-medium text-positive">
						Completed
					</span>
				)}
			</div>

			<div className="mt-3 flex justify-end">
				<RowActions
					label={repair.description}
					editTo={`/repairs/${repair.id}/edit`}
					onDelete={onDelete}
				/>
			</div>

			<p className="mt-2 text-[0.8125rem] text-text-muted">
				{formatNumericDate(repair.date)}
				{repair.mileage != null && ` • ${formatMiles(repair.mileage)}`}
			</p>

			{repair.cost != null && (
				<p className="mt-2 text-[0.875rem] font-semibold text-positive">
					{formatCost(repair.cost)}
				</p>
			)}

			{repair.vendorName && (
				<p className="mt-2 text-[0.8125rem] text-text-muted">{repair.vendorName}</p>
			)}

			{repair.attachmentCount > 0 && (
				<p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[0.75rem] text-text-muted">
					<Paperclip className="size-3" strokeWidth={1.75} aria-hidden />
					{repair.attachmentCount} {repair.attachmentCount === 1 ? 'receipt' : 'receipts'}
				</p>
			)}
		</article>
	);
}

export function VehicleDetailPage() {
	const { id = '' } = useParams();
	const client = useQueryClient();

	const { data, isPending, isError, error } = useQuery({
		queryKey: keys.vehicle(id),
		queryFn: () => getVehicle(id)
	});

	/* Both lists also show these rows, so both keys are invalidated alongside this one. */
	const invalidate = (key: readonly string[]) => () => {
		client.invalidateQueries({ queryKey: keys.vehicle(id) });
		client.invalidateQueries({ queryKey: key });
	};

	const removeNote = useMutation({ mutationFn: deleteNote, onSuccess: invalidate(keys.notes) });
	const removeRepair = useMutation({
		mutationFn: deleteRepair,
		onSuccess: invalidate(keys.repairs)
	});

	const vehicle = data?.vehicle;
	const title = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : '';
	useCrumbs(vehicle ? [{ label: vehicle.nickname || title }] : []);

	if (isPending) {
		return <p className="py-10 text-[0.9375rem] text-text-muted">Loading…</p>;
	}

	if (isError || !vehicle) {
		return (
			<div className="py-10">
				<p role="alert" className="text-[0.9375rem] text-destructive">
					{error instanceof Error ? error.message : 'Vehicle not found'}
				</p>
				<Link to="/vehicles" className="mt-4 inline-block text-[0.9375rem] text-accent-bright">
					Back to your garage
				</Link>
			</div>
		);
	}

	const engine = [vehicle.engineSize, vehicle.engineType].filter(Boolean).join(' ');

	return (
		<div className="flex flex-col gap-6">
			<div className="grid gap-6 lg:grid-cols-3">
				<section className="card p-6">
					{vehicle.image ? (
						<img
							src={vehicle.image}
							alt=""
							className="h-48 w-full rounded-control border border-border object-cover"
						/>
					) : (
						<div
							aria-hidden
							className="flex h-48 w-full items-center justify-center rounded-control border border-border bg-surface-raised"
						>
							<Car className="size-10 text-text-faint" strokeWidth={1.25} />
						</div>
					)}

					<h1 className="display mt-6 text-[1.75rem]">{vehicle.nickname || title}</h1>

					{vehicle.vin && (
						<div className="mt-4">
							<CopyVin vin={vehicle.vin} />
						</div>
					)}

					<div className="mt-6">
						<SpecRow
							icon={<Calendar className="size-4" />}
							label="Year"
							value={String(vehicle.year)}
						/>
						<SpecRow
							icon={<Car className="size-4" />}
							label="Make & Model"
							value={`${vehicle.make} ${vehicle.model}`}
						/>
						{vehicle.bodyStyle && (
							<SpecRow
								icon={<Car className="size-4" />}
								label="Body Style"
								value={vehicle.bodyStyle}
							/>
						)}
						{vehicle.color && (
							<SpecRow icon={<Palette className="size-4" />} label="Color" value={vehicle.color} />
						)}
						{engine && <SpecRow icon={<Cog className="size-4" />} label="Engine" value={engine} />}
						{vehicle.transmission && (
							<SpecRow
								icon={<Cog className="size-4" />}
								label="Transmission"
								value={vehicle.transmission}
							/>
						)}
						{vehicle.currentMileage != null && (
							<SpecRow
								icon={<Gauge className="size-4" />}
								label="Mileage"
								value={formatMiles(vehicle.currentMileage)}
							/>
						)}
						{vehicle.licensePlate && (
							<SpecRow
								icon={<Hash className="size-4" />}
								label="Plate"
								value={[vehicle.licensePlate, vehicle.licensePlateState]
									.filter(Boolean)
									.join(' · ')}
							/>
						)}
					</div>

					<Renewals vehicle={vehicle} />

					<Link
						to={`/vehicles/${vehicle.id}/edit`}
						className="mt-6 flex w-full items-center justify-center gap-2 rounded-control border border-accent/50 py-3 text-[0.9375rem] text-text transition-colors hover:bg-accent/10"
					>
						<Pencil className="size-4 text-accent-bright" strokeWidth={1.75} aria-hidden />
						Edit Vehicle
					</Link>

					{/* Plain links, not router links: the endpoints answer with a file, and the
					    session cookie travels with a same-origin download like any request. */}
					<div className="mt-3 grid grid-cols-2 gap-3">
						<a
							href={`/api/vehicles/${vehicle.id}/report`}
							download
							className="flex items-center justify-center gap-2 rounded-control border border-border py-2.5 text-[0.8125rem] text-text-muted transition-colors hover:border-border-strong hover:text-text"
						>
							<FileDown className="size-4" strokeWidth={1.75} aria-hidden />
							History (PDF)
						</a>
						<a
							href={`/api/vehicles/${vehicle.id}/history.csv`}
							download
							className="flex items-center justify-center gap-2 rounded-control border border-border py-2.5 text-[0.8125rem] text-text-muted transition-colors hover:border-border-strong hover:text-text"
						>
							<Table2 className="size-4" strokeWidth={1.75} aria-hidden />
							Repairs (CSV)
						</a>
					</div>
				</section>

				<Panel
					icon={<FileText className="size-5" />}
					title="Notes"
					addTo={`/notes/new?vehicle=${vehicle.id}`}
					addLabel="Add Note"
				>
					{data.notes.length === 0 ? (
						<Empty
							icon={<FileText className="size-5" strokeWidth={1.5} />}
							title="No notes yet"
							line="Receipts, known issues and anything else worth remembering."
						/>
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
				</Panel>

				<Panel
					icon={<Wrench className="size-5" />}
					title="Repairs"
					addTo={`/repairs/new?vehicle=${vehicle.id}`}
					addLabel="Add Repair"
				>
					{data.repairs.length === 0 ? (
						<Empty
							icon={<Wrench className="size-5" strokeWidth={1.5} />}
							title="No repairs logged"
							line="Every service you record builds this car's history."
						/>
					) : (
						<div className="flex flex-col gap-4">
							{data.repairs.map((repair) => (
								<RepairCard
									key={repair.id}
									repair={repair}
									onDelete={() => removeRepair.mutate(repair.id)}
								/>
							))}
						</div>
					)}
				</Panel>
			</div>

			<Panel icon={<Clock className="size-5" />} title="Maintenance Schedule">
				<ScheduleEditor
					vehicleId={vehicle.id}
					currentMileage={vehicle.currentMileage}
					schedules={data.schedules}
				/>
			</Panel>

			<Panel icon={<Camera className="size-5" />} title="Galleries">
				<GalleryEditor vehicleId={vehicle.id} galleries={data.galleries} />
			</Panel>
		</div>
	);
}
