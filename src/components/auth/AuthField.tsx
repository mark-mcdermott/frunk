import type { LucideIcon } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
	id: string;
	/** Visually hidden — the mocks label these fields by placeholder and leading icon. */
	label: string;
	icon: LucideIcon;
}

/**
 * Dark-on-light input with a leading icon, ~10px radius (DESIGN.md §5).
 *
 * The mocks carry no visible labels, so the real one is `sr-only`: a placeholder is not
 * an accessible name, and it disappears the moment anything is typed.
 */
export function AuthField({ id, label, icon: Icon, className, ...input }: Props) {
	return (
		<div>
			<label htmlFor={id} className="sr-only">
				{label}
			</label>
			<div className="relative">
				<Icon
					aria-hidden
					strokeWidth={1.75}
					className="pointer-events-none absolute left-4 top-1/2 size-[1.125rem] -translate-y-1/2 text-text-faint"
				/>
				<input
					id={id}
					className={`h-[3.25rem] w-full rounded-control border border-border-strong bg-surface-raised pl-12 pr-4 text-[0.9375rem] text-text transition-colors placeholder:text-text-faint hover:border-[rgb(11_15_24_/_0.28)] focus:border-accent focus:outline-none focus-visible:outline-none ${className ?? ''}`}
					{...input}
				/>
			</div>
		</div>
	);
}
