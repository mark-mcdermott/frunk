import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, DollarSign, Pencil, Plus, Store, Trash2, Wrench } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { deleteRepair, keys, listRepairs, type RepairRow, type RepairStatus } from '../api';
import {
	FilterChips,
	IconButton,
	ListCard,
	ListEmpty,
	ListState,
	SearchInput,
	type Filter
} from '../components/List';
import { formatCost, formatDate, formatMiles } from '../format';

/**
 * Every repair across every vehicle, built to `docs/mocks/repairs-index.webp`.
 *
 * `GET /api/repairs` joins the vehicle and vendor names in, so a row needs no further
 * lookups. The counts on the filter chips are derived from the loaded rows rather than
 * a separate endpoint, which is what keeps them honest — a chip can never claim a total
 * the list below it is not about to show.
 *
 * The mock paginates at six rows. That is not built: pagination without a server `LIMIT`
 * is theatre, and the endpoint returns everything. It goes in with the endpoint's
 * cursor, not before.
 */

const STATUS_LABELS: Record<RepairStatus, string> = {
	completed: 'Completed',
	scheduled: 'Scheduled',
	in_progress: 'In progress'
};

type FilterKey = 'all' | RepairStatus;

const SORTS = {
	'date-desc': { label: 'Date (newest)', compare: (a: RepairRow, b: RepairRow) => cmp(b.date, a.date) },
	'date-asc': { label: 'Date (oldest)', compare: (a: RepairRow, b: RepairRow) => cmp(a.date, b.date) },
	'cost-desc': {
		label: 'Cost (highest)',
		compare: (a: RepairRow, b: RepairRow) => (b.cost ?? 0) - (a.cost ?? 0)
	}
} as const;

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function StatusBadge({ status }: { status: string }) {
	const tone =
		status === 'completed'
			? 'bg-positive-bg text-positive'
			: status === 'scheduled'
				? 'bg-accent/15 text-accent-bright'
				: 'bg-surface-raised text-text-muted';

	return (
		<span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.6875rem] font-medium ${tone}`}>
			{STATUS_LABELS[status as RepairStatus] ?? status}
		</span>
	);
}

function RepairRowItem({ repair, onDelete }: { repair: RepairRow; onDelete: () => void }) {
	const navigate = useNavigate();
	const vehicle = `${repair.vehicleYear} ${repair.vehicleMake} ${repair.vehicleModel}`;

	return (
		<article className="flex items-center gap-5 border-b border-border px-6 py-5 last:border-b-0">
			<span
				aria-hidden
				className="flex size-14 shrink-0 items-center justify-center rounded-[12px] border border-border bg-surface-raised"
			>
				<Wrench className="size-5 text-accent-bright" strokeWidth={1.5} />
			</span>

			<div className="min-w-0 flex-1">
				<h2 className="display-sm truncate text-lg">
					<Link to={`/repairs/${repair.id}`} className="transition-opacity hover:opacity-80">
						{repair.description}
					</Link>
				</h2>

				<p className="mt-1 truncate text-[0.875rem] text-text-muted">
					<Link to={`/vehicles/${repair.vehicleId}`} className="hover:text-text">
						{vehicle}
					</Link>
				</p>

				<div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[0.8125rem] text-text-muted">
					<span className="flex items-center gap-1.5">
						<Calendar className="size-3.5" strokeWidth={1.75} aria-hidden />
						{formatDate(repair.date)}
					</span>
					{repair.mileage != null && <span>{formatMiles(repair.mileage)}</span>}
					{repair.cost != null && (
						<span className="flex items-center gap-1 text-positive">
							<DollarSign className="size-3.5" strokeWidth={1.75} aria-hidden />
							{formatCost(repair.cost)}
						</span>
					)}
					{repair.vendorName && (
						<span className="flex items-center gap-1.5">
							<Store className="size-3.5" strokeWidth={1.75} aria-hidden />
							{repair.vendorName}
						</span>
					)}
				</div>
			</div>

			<StatusBadge status={repair.status} />

			<div className="flex shrink-0 items-center gap-2">
				<IconButton
					label={`Edit ${repair.description}`}
					onClick={() => navigate(`/repairs/${repair.id}/edit`)}
				>
					<Pencil className="size-4" strokeWidth={1.75} aria-hidden />
				</IconButton>
				<IconButton label={`Delete ${repair.description}`} tone="destructive" onClick={onDelete}>
					<Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
				</IconButton>
			</div>
		</article>
	);
}

export function RepairsPage() {
	const client = useQueryClient();
	const [search, setSearch] = useState('');
	const [filter, setFilter] = useState<FilterKey>('all');
	const [sort, setSort] = useState<keyof typeof SORTS>('date-desc');

	const { data: repairs, isPending, isError, error } = useQuery({
		queryKey: keys.repairs,
		queryFn: listRepairs
	});

	const remove = useMutation({
		mutationFn: deleteRepair,
		onSuccess: () => {
			client.invalidateQueries({ queryKey: keys.repairs });
			// A repair also appears on its vehicle's detail screen.
			client.invalidateQueries({ queryKey: keys.vehicles });
		}
	});

	const all = repairs ?? [];

	const filters: Filter<FilterKey>[] = [
		{ key: 'all', label: 'All', count: all.length },
		{
			key: 'completed',
			label: 'Completed',
			count: all.filter((r) => r.status === 'completed').length,
			tone: 'positive'
		},
		{
			key: 'scheduled',
			label: 'Scheduled',
			count: all.filter((r) => r.status === 'scheduled').length
		},
		{
			key: 'in_progress',
			label: 'In progress',
			count: all.filter((r) => r.status === 'in_progress').length
		}
	];

	const term = search.trim().toLowerCase();
	const visible = all
		.filter((repair) => filter === 'all' || repair.status === filter)
		.filter((repair) => {
			if (!term) return true;
			return `${repair.description} ${repair.vehicleYear} ${repair.vehicleMake} ${repair.vehicleModel} ${repair.vendorName ?? ''}`
				.toLowerCase()
				.includes(term);
		})
		.sort(SORTS[sort].compare);

	return (
		<>
			<div className="flex flex-wrap items-start justify-between gap-6">
				<div>
					<h1 className="display text-[clamp(2rem,4vw,2.75rem)]">All Repairs</h1>
					<p className="mt-3 text-[0.9375rem] text-text-muted">
						{all.length} {all.length === 1 ? 'repair' : 'repairs'} across all vehicles
					</p>
				</div>

				<Link to="/repairs/new" className="btn-primary">
					<Plus className="size-4" strokeWidth={2} aria-hidden />
					Add Repair
				</Link>
			</div>

			<div className="mt-8 flex flex-wrap items-center justify-between gap-4">
				<FilterChips
					label="Filter repairs by status"
					filters={filters}
					active={filter}
					onChange={setFilter}
				/>

				<div className="flex flex-wrap items-center gap-3">
					<SearchInput
						id="repair-search"
						label="Search repairs"
						value={search}
						onChange={setSearch}
						placeholder="Search repairs…"
					/>
					<label htmlFor="repair-sort" className="sr-only">
						Sort repairs
					</label>
					<select
						id="repair-sort"
						value={sort}
						onChange={(event) => setSort(event.target.value as keyof typeof SORTS)}
						className="h-[2.875rem] rounded-control border border-border bg-surface-raised px-4 text-[0.875rem] text-text focus:border-accent focus:outline-none"
					>
						{Object.entries(SORTS).map(([key, { label }]) => (
							<option key={key} value={key}>
								Sort by: {label}
							</option>
						))}
					</select>
				</div>
			</div>

			<ListCard>
				{isPending || isError ? (
					<ListState pending={isPending} error={error} noun="repairs" />
				) : visible.length === 0 ? (
					<ListEmpty
						icon={<Wrench className="size-5" strokeWidth={1.5} />}
						title={all.length === 0 ? 'No repairs logged' : 'Nothing matches that'}
						line={
							all.length === 0
								? 'Every service you record builds a vehicle history worth having.'
								: 'Try a different description, vehicle or vendor.'
						}
					/>
				) : (
					visible.map((repair) => (
						<RepairRowItem
							key={repair.id}
							repair={repair}
							onDelete={() => remove.mutate(repair.id)}
						/>
					))
				)}
			</ListCard>
		</>
	);
}
