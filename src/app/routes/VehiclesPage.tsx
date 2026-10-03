import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Car, Clock, Folder, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import type { Summary } from '@/lib/maintenance';
import { deleteVehicle, keys, listVehicles, type VehicleListItem } from '../api';
import { formatDate, formatTime } from '../format';
import { EmptyState } from '../components/EmptyState';
import { VehicleOutline } from '../components/VehicleOutline';
import { FileImage } from '../files';

/**
 * The garage, built to `docs/mocks/vehicles-index.webp`.
 *
 * Rows live inside **one** card separated by hairlines, not as detached cards
 * (DESIGN.md §5) — the mock's list reads as a single object with divisions, which is
 * what makes it feel like a ledger rather than a feed.
 *
 * The mock's document-count chip is rendered from real data or not at all. There is no
 * documents entity yet, so it shows the gallery count when one exists; inventing
 * "1,247 documents" would look finished and mean nothing.
 */

/** Label above, value bold, time muted beneath — the mock's right-aligned stacks. */
function Stamp({ label, iso }: { label: string; iso: string }) {
	return (
		<div className="hidden sm:block">
			<p className="text-[0.625rem] tracking-[0.12em] text-text-faint uppercase">{label}</p>
			<p className="mt-1 text-[0.8125rem] font-semibold text-text">{formatDate(iso)}</p>
			<p className="text-[0.75rem] text-text-muted">{formatTime(iso)}</p>
		</div>
	);
}

/**
 * The row's maintenance verdict, worst first: overdue outranks due soon, and a car
 * with nothing due shows nothing rather than an "all good" that would be noise
 * across a garage.
 */
function MaintenanceBadge({ maintenance }: { maintenance: Summary }) {
	if (maintenance.overdue > 0) {
		return (
			<span className="inline-flex items-center gap-1.5 rounded-full bg-destructive-bg px-3 py-1 text-[0.75rem] font-medium whitespace-nowrap text-destructive">
				<AlertTriangle className="size-3.5" strokeWidth={2} aria-hidden />
				{maintenance.overdue} overdue
			</span>
		);
	}
	if (maintenance.dueSoon > 0) {
		return (
			<span className="inline-flex items-center gap-1.5 rounded-full bg-warning-bg px-3 py-1 text-[0.75rem] font-medium whitespace-nowrap text-warning">
				<Clock className="size-3.5" strokeWidth={2} aria-hidden />
				{maintenance.dueSoon} due soon
			</span>
		);
	}
	return null;
}

function VehicleRow({
	vehicle,
	onDelete
}: {
	vehicle: VehicleListItem;
	onDelete: (id: string) => void;
}) {
	const title = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

	return (
		<article className="flex items-center gap-4 border-b border-border px-4 py-5 last:border-b-0 sm:gap-6 sm:px-6">
			{vehicle.image ? (
				<FileImage
					src={vehicle.image}
					alt=""
					className="size-16 shrink-0 rounded-[12px] border border-border object-cover sm:size-20"
				/>
			) : (
				<span
					aria-hidden
					className="flex size-16 shrink-0 items-center justify-center rounded-[12px] border border-border bg-surface-raised sm:size-20"
				>
					<VehicleOutline bodyStyle={vehicle.bodyStyle} className="w-[88%] text-text-faint" />
				</span>
			)}

			<div className="min-w-0 flex-1">
				{/* A phone has no room for the stamps or the row actions, so the name gets the
				    width and wraps rather than truncating to "1974 AM…". */}
				<h2 className="display-sm text-lg sm:truncate sm:text-xl">
					<Link to={`/vehicles/${vehicle.id}`} className="transition-opacity hover:opacity-80">
						{vehicle.nickname || title}
					</Link>
				</h2>

				{vehicle.vin && (
					<p className="mt-1 truncate text-[0.8125rem] text-text-muted">
						VIN: <span className="text-accent-bright">{vehicle.vin}</span>
					</p>
				)}

				<div className="mt-3 flex flex-wrap items-center gap-2 empty:hidden">
					{vehicle.currentMileage != null && (
						<span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-[0.75rem] whitespace-nowrap text-text-muted">
							<Folder className="size-3.5" strokeWidth={1.75} aria-hidden />
							{vehicle.currentMileage.toLocaleString()} miles
						</span>
					)}
					<MaintenanceBadge maintenance={vehicle.maintenance} />
				</div>
			</div>

			<Stamp label="Last updated" iso={vehicle.updatedAt} />
			<Stamp label="Added" iso={vehicle.createdAt} />

			{/* Edit and delete are on the vehicle's own screen too, which is where a phone
			    finds them. */}
			<div className="hidden shrink-0 items-center gap-2 sm:flex">
				<Link
					to={`/vehicles/${vehicle.id}/edit`}
					aria-label={`Edit ${title}`}
					className="flex size-9 items-center justify-center rounded-full border border-border text-text-muted transition-colors hover:border-text-muted hover:text-text"
				>
					<Pencil className="size-4" strokeWidth={1.75} aria-hidden />
				</Link>
				<button
					type="button"
					onClick={() => onDelete(vehicle.id)}
					aria-label={`Delete ${title}`}
					className="flex size-9 items-center justify-center rounded-full border border-destructive/40 text-destructive transition-colors hover:bg-destructive-bg"
				>
					<Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
				</button>
			</div>
		</article>
	);
}

export function VehiclesPage() {
	const client = useQueryClient();
	const [search, setSearch] = useState('');

	const {
		data: vehicles,
		isPending,
		isError,
		error
	} = useQuery({
		queryKey: keys.vehicles,
		queryFn: listVehicles
	});

	const remove = useMutation({
		mutationFn: deleteVehicle,
		// Invalidates the same key the list is cached under — see `keys` in api.ts.
		onSuccess: () => client.invalidateQueries({ queryKey: keys.vehicles })
	});

	const filtered = (vehicles ?? []).filter((vehicle) => {
		if (!search.trim()) return true;
		const haystack =
			`${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.nickname ?? ''} ${vehicle.vin ?? ''}`.toLowerCase();
		return haystack.includes(search.trim().toLowerCase());
	});

	return (
		<>
			<div className="flex flex-wrap items-start justify-between gap-6">
				<div>
					<h1 className="display text-[clamp(2rem,4vw,2.75rem)]">My Vehicles</h1>
					<p className="mt-3 text-[0.9375rem] text-text-muted">
						Manage your vehicles and their documents.
					</p>
				</div>

				<Link to="/vehicles/new" className="btn-primary">
					<Plus className="size-4" strokeWidth={2} aria-hidden />
					Add Vehicle
				</Link>
			</div>

			<div className="mt-10">
				<label htmlFor="search" className="sr-only">
					Search vehicles
				</label>
				<input
					id="search"
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder="Search vehicles…"
					className="w-full max-w-sm rounded-control border border-border bg-surface-raised px-4 py-3 text-[0.9375rem] text-text transition-colors placeholder:text-text-faint focus:border-accent focus:outline-none"
				/>
			</div>

			<div className="card mt-6 overflow-hidden">
				{isPending && (
					<p className="px-6 py-10 text-[0.9375rem] text-text-muted">Loading your garage…</p>
				)}

				{isError && (
					<p role="alert" className="px-6 py-10 text-[0.9375rem] text-destructive">
						{error instanceof Error ? error.message : 'Could not load your vehicles.'}
					</p>
				)}

				{!isPending && !isError && filtered.length === 0 && (
					<EmptyState
						icon={<Car className="size-5" strokeWidth={1.5} />}
						title={search ? 'Nothing matches that' : 'No vehicles yet'}
						line={
							search
								? 'Try a different make, model or VIN.'
								: 'Add your first vehicle and its documents will have somewhere to live.'
						}
					/>
				)}

				{filtered.map((vehicle) => (
					<VehicleRow key={vehicle.id} vehicle={vehicle} onDelete={remove.mutate} />
				))}
			</div>
		</>
	);
}
