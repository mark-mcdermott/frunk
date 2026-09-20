/**
 * The shape of a screen that has not loaded yet: a heading, a line of copy, a card.
 * The applet's Suspense fallback while a route chunk downloads — the same shimmer
 * language as the auth pages' skeleton, so "loading" looks like one thing everywhere.
 */
export function PageSkeleton() {
	return (
		<div role="status" aria-busy="true" aria-label="Loading">
			<div className="skeleton h-10 w-64" />
			<div className="skeleton mt-4 h-4 w-96 max-w-full" />
			<div className="card mt-10 flex flex-col gap-5 p-6">
				<div className="skeleton h-14 w-full" />
				<div className="skeleton h-14 w-full" />
				<div className="skeleton h-14 w-full" />
			</div>
		</div>
	);
}
