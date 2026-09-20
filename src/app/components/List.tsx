import { Search } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * The pieces every index screen repeats — built to `repairs-index.webp` and
 * `notes-index.webp`, which draw the same search box and counted filter chips above a
 * single hairline-divided card.
 */

export function SearchInput({
	id,
	label,
	value,
	onChange,
	placeholder
}: {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	placeholder: string;
}) {
	return (
		<div className="relative w-full max-w-sm">
			<label htmlFor={id} className="sr-only">
				{label}
			</label>
			<Search
				aria-hidden
				className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-text-faint"
				strokeWidth={1.75}
			/>
			<input
				id={id}
				type="search"
				value={value}
				placeholder={placeholder}
				onChange={(event) => onChange(event.target.value)}
				className="h-[2.875rem] w-full rounded-control border border-border bg-surface-raised pl-11 pr-4 text-[0.9375rem] text-text transition-colors placeholder:text-text-faint focus:border-accent focus:outline-none"
			/>
		</div>
	);
}

export interface Filter<T extends string> {
	key: T;
	label: string;
	count: number;
	/** Tints the count when the chip is inactive — green for done, amber for pending. */
	tone?: 'positive' | 'muted';
}

/**
 * Counted filter chips. The counts come from the loaded rows rather than a separate
 * endpoint, so they always agree with what the list is about to show.
 */
export function FilterChips<T extends string>({
	label,
	filters,
	active,
	onChange
}: {
	label: string;
	filters: readonly Filter<T>[];
	active: T;
	onChange: (key: T) => void;
}) {
	return (
		<div role="group" aria-label={label} className="flex flex-wrap gap-3">
			{filters.map((filter) => {
				const isActive = filter.key === active;

				return (
					<button
						key={filter.key}
						type="button"
						aria-pressed={isActive}
						onClick={() => onChange(filter.key)}
						className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[0.8125rem] transition-colors ${
							isActive
								? 'border-accent-bright/60 text-text'
								: 'border-border text-text-muted hover:border-border-strong hover:text-text'
						}`}
					>
						{filter.label}
						<span
							className={
								filter.tone === 'positive' && !isActive ? 'text-positive' : 'text-text-faint'
							}
						>
							{filter.count}
						</span>
					</button>
				);
			})}
		</div>
	);
}

/** One card, rows separated by hairlines — not detached cards (DESIGN.md §5). */
export function ListCard({ children }: { children: ReactNode }) {
	return <div className="card mt-6 overflow-hidden">{children}</div>;
}

export function ListEmpty({
	icon,
	title,
	line
}: {
	icon: ReactNode;
	title: string;
	line: string;
}) {
	return (
		<div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
			<span
				aria-hidden
				className="flex size-12 items-center justify-center rounded-full bg-accent/10 text-accent-bright"
			>
				{icon}
			</span>
			<h2 className="display-sm text-lg">{title}</h2>
			<p className="max-w-xs text-[0.875rem] text-text-muted">{line}</p>
		</div>
	);
}

export function ListState({
	pending,
	error,
	noun
}: {
	pending: boolean;
	error: unknown;
	noun: string;
}) {
	if (pending) {
		return <p className="px-6 py-10 text-[0.9375rem] text-text-muted">Loading your {noun}…</p>;
	}

	return (
		<p role="alert" className="px-6 py-10 text-[0.9375rem] text-destructive">
			{error instanceof Error ? error.message : `Could not load your ${noun}.`}
		</p>
	);
}

/** Circular, 1px bordered; neutral for edit, red glyph on red border for delete. */
export function IconButton({
	label,
	tone = 'neutral',
	onClick,
	children
}: {
	label: string;
	tone?: 'neutral' | 'destructive';
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			aria-label={label}
			onClick={onClick}
			className={`flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
				tone === 'destructive'
					? 'border-destructive/40 text-destructive hover:bg-destructive-bg'
					: 'border-border text-text-muted hover:border-text-muted hover:text-text'
			}`}
		>
			{children}
		</button>
	);
}
