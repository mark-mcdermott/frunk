import type { ReactNode } from 'react';

/**
 * Nothing here yet (DESIGN.md §5).
 *
 * A screen whose whole purpose is the missing list gets the full treatment: an icon in a
 * soft violet glow, a title, one line of guidance. A panel among others gets `compact`,
 * just the title and the line. A vehicle page made of five centred, glowing empty states
 * read as five announcements that there is nothing here (dogfooding, 2026-10-02).
 */
export function EmptyState({
	icon,
	title,
	line,
	compact = false
}: {
	icon?: ReactNode;
	title: string;
	line: string;
	compact?: boolean;
}) {
	if (compact) {
		return (
			<div>
				<h3 className="heading text-[0.9375rem]">{title}</h3>
				<p className="mt-1 text-[0.8125rem] text-text-muted">{line}</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
			<span
				aria-hidden
				className="flex size-12 items-center justify-center rounded-full bg-accent/10 text-accent-bright"
			>
				{icon}
			</span>
			<h2 className="heading text-lg">{title}</h2>
			<p className="max-w-xs text-[0.875rem] text-text-muted">{line}</p>
		</div>
	);
}
