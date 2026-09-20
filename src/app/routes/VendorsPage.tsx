import { useQuery } from '@tanstack/react-query';
import { Store } from 'lucide-react';
import { keys, listVendors } from '../api';

/**
 * Vendors, built to `docs/mocks/vendor-index.webp`.
 *
 * Same list-in-one-card shape as the garage (DESIGN.md §5). Deliberately thin for now:
 * it exists so a second route proves client-side navigation, the active-nav dot and a
 * second query key all work before the remaining screens are built on the pattern.
 */
export function VendorsPage() {
	const { data: vendors, isPending, isError } = useQuery({
		queryKey: keys.vendors,
		queryFn: listVendors
	});

	return (
		<>
			<h1 className="display text-[clamp(2rem,4vw,2.75rem)]">Vendors</h1>
			<p className="mt-3 text-[0.9375rem] text-text-muted">
				The shops and specialists who work on your cars.
			</p>

			<div className="card mt-10 overflow-hidden">
				{isPending && (
					<p className="px-6 py-10 text-[0.9375rem] text-text-muted">Loading vendors…</p>
				)}

				{isError && (
					<p role="alert" className="px-6 py-10 text-[0.9375rem] text-destructive">
						Could not load your vendors.
					</p>
				)}

				{!isPending && !isError && vendors?.length === 0 && (
					<div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
						<span
							aria-hidden
							className="flex size-12 items-center justify-center rounded-full bg-accent/10"
						>
							<Store className="size-5 text-accent-bright" strokeWidth={1.5} />
						</span>
						<h2 className="display-sm text-lg">No vendors yet</h2>
						<p className="max-w-xs text-[0.875rem] text-text-muted">
							Add one when you log a repair, and it will be here next time.
						</p>
					</div>
				)}

				{vendors?.map((vendor) => (
					<article
						key={vendor.id}
						className="flex items-center gap-6 border-b border-border px-6 py-5 last:border-b-0"
					>
						<div className="min-w-0 flex-1">
							<h2 className="display-sm truncate text-lg">{vendor.name}</h2>
							{vendor.address && (
								<p className="mt-1 truncate text-[0.8125rem] text-text-muted">{vendor.address}</p>
							)}
						</div>
						{vendor.phone && (
							<p className="hidden text-[0.8125rem] text-text-muted sm:block">{vendor.phone}</p>
						)}
					</article>
				))}
			</div>
		</>
	);
}
