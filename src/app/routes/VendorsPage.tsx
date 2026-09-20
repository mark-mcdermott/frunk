import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Globe, MapPin, Pencil, Phone, Plus, Store, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { deleteVendor, keys, listVendors, type Vendor } from '../api';
import { IconButton, ListCard, ListEmpty, ListState, SearchInput } from '../components/List';

/**
 * Vendors, built to `docs/mocks/vendor-index.webp`.
 *
 * **The mock draws detached cards; this uses one card with hairline dividers.** The
 * spec is explicit that list rows live inside a single card and not as detached cards
 * (DESIGN.md §5), the other three index screens follow it, and one screen looking
 * different for no reason costs more than matching a mock that contradicts the spec it
 * was derived from.
 *
 * Deleting a vendor keeps its repairs — `vendor_id` goes null (`docs/API.md`) — so the
 * confirmation says so rather than implying the service history goes with it.
 */

function VendorRow({ vendor, onDelete }: { vendor: Vendor; onDelete: () => void }) {
	const navigate = useNavigate();

	return (
		<article className="flex items-center gap-5 border-b border-border px-6 py-5 last:border-b-0">
			<span
				aria-hidden
				className="flex size-14 shrink-0 items-center justify-center rounded-[12px] border border-border bg-surface-raised"
			>
				<Store className="size-5 text-accent-bright" strokeWidth={1.5} />
			</span>

			<div className="min-w-0 flex-1">
				<h2 className="display-sm truncate text-lg">
					<Link to={`/vendors/${vendor.id}/edit`} className="transition-opacity hover:opacity-80">
						{vendor.name}
					</Link>
				</h2>

				<div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[0.8125rem] text-text-muted">
					{vendor.phone && (
						<a href={`tel:${vendor.phone}`} className="flex items-center gap-1.5 hover:text-text">
							<Phone className="size-3.5" strokeWidth={1.75} aria-hidden />
							{vendor.phone}
						</a>
					)}
					{vendor.address && (
						<span className="flex items-center gap-1.5">
							<MapPin className="size-3.5" strokeWidth={1.75} aria-hidden />
							{vendor.address}
						</span>
					)}
					{vendor.website && (
						<a
							href={vendor.website}
							target="_blank"
							rel="noreferrer noopener"
							className="flex items-center gap-1.5 text-accent-bright hover:opacity-80"
						>
							<Globe className="size-3.5" strokeWidth={1.75} aria-hidden />
							Website
						</a>
					)}
				</div>
			</div>

			<div className="flex shrink-0 items-center gap-2">
				<IconButton
					label={`Edit ${vendor.name}`}
					onClick={() => navigate(`/vendors/${vendor.id}/edit`)}
				>
					<Pencil className="size-4" strokeWidth={1.75} aria-hidden />
				</IconButton>
				<IconButton label={`Delete ${vendor.name}`} tone="destructive" onClick={onDelete}>
					<Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
				</IconButton>
			</div>
		</article>
	);
}

export function VendorsPage() {
	const client = useQueryClient();
	const [search, setSearch] = useState('');
	const [confirming, setConfirming] = useState<Vendor | null>(null);

	const {
		data: vendors,
		isPending,
		isError,
		error
	} = useQuery({
		queryKey: keys.vendors,
		queryFn: listVendors
	});

	const remove = useMutation({
		mutationFn: deleteVendor,
		onSuccess: () => {
			setConfirming(null);
			client.invalidateQueries({ queryKey: keys.vendors });
			// Repairs carry the vendor's name, and it is now null on them.
			client.invalidateQueries({ queryKey: keys.repairs });
			client.invalidateQueries({ queryKey: keys.vehicles });
		}
	});

	const term = search.trim().toLowerCase();
	const visible = (vendors ?? []).filter((vendor) => {
		if (!term) return true;
		return `${vendor.name} ${vendor.address ?? ''} ${vendor.phone ?? ''}`
			.toLowerCase()
			.includes(term);
	});

	return (
		<>
			<div className="flex flex-wrap items-start justify-between gap-6">
				<div>
					<h1 className="display text-[clamp(2rem,4vw,2.75rem)]">My Vendors</h1>
					<p className="mt-3 text-[0.9375rem] text-text-muted">
						Manage your repair shops and service providers.
					</p>
				</div>

				<Link to="/vendors/new" className="btn-primary">
					<Plus className="size-4" strokeWidth={2} aria-hidden />
					Add Vendor
				</Link>
			</div>

			<div className="mt-8">
				<SearchInput
					id="vendor-search"
					label="Search vendors"
					value={search}
					onChange={setSearch}
					placeholder="Search vendors…"
				/>
			</div>

			{confirming && (
				<div
					role="alertdialog"
					aria-labelledby="delete-vendor-heading"
					className="card mt-6 border-destructive/40 p-6"
				>
					<h2 id="delete-vendor-heading" className="display-sm text-lg">
						Delete {confirming.name}?
					</h2>
					<p className="mt-2 text-[0.875rem] text-text-muted">
						Repairs done here are kept — they simply stop naming a vendor. This cannot be undone.
					</p>
					<div className="mt-5 flex flex-wrap items-center gap-3">
						<button
							type="button"
							disabled={remove.isPending}
							onClick={() => remove.mutate(confirming.id)}
							className="rounded-full bg-destructive px-5 py-3 text-[0.9375rem] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
						>
							{remove.isPending ? 'Deleting…' : 'Delete permanently'}
						</button>
						<button
							type="button"
							onClick={() => setConfirming(null)}
							className="text-[0.9375rem] text-text-muted transition-colors hover:text-text"
						>
							Cancel
						</button>
					</div>
				</div>
			)}

			<ListCard>
				{isPending || isError ? (
					<ListState pending={isPending} error={error} noun="vendors" />
				) : visible.length === 0 ? (
					<ListEmpty
						icon={<Store className="size-5" strokeWidth={1.5} />}
						title={vendors?.length === 0 ? 'No vendors yet' : 'Nothing matches that'}
						line={
							vendors?.length === 0
								? 'Add the shops you use, and repairs can name where they were done.'
								: 'Try a different name, address or phone number.'
						}
					/>
				) : (
					visible.map((vendor) => (
						<VendorRow key={vendor.id} vendor={vendor} onDelete={() => setConfirming(vendor)} />
					))
				)}
			</ListCard>
		</>
	);
}
