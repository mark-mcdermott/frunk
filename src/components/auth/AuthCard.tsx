import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { NATIVE } from '../../lib/platform';

/**
 * The auth card, built to `docs/mocks/sign-in.webp` and `sign-up.webp`.
 *
 * The mocks draw it as a modal floating over a dimmed home page. It is a route here
 * instead — a page you can link to, bookmark and come back to after a passkey prompt,
 * none of which a modal survives. The card keeps the mock's proportions, and the
 * close control keeps its position and becomes the way back to the home page.
 *
 * Deliberately light in both themes, like the marketing header: DESIGN.md §4 has
 * full-bleed sections choose their own ground rather than inherit the viewer's.
 */
interface Props {
	/** Rendered in display serif; a violet period is appended (DESIGN.md §1). */
	title: string;
	subtitle: string;
	children: ReactNode;
}

export function AuthCard({ title, subtitle, children }: Props) {
	return (
		<div className="relative w-full max-w-[27.5rem] rounded-[20px] bg-surface-raised p-8 shadow-[0_24px_80px_-24px_rgb(11_15_24_/_0.28)] sm:p-10">
			{/* The native bundle has no home page behind the card to go back to. */}
			{!NATIVE && (
				<a
					href="/"
					aria-label="Back to the home page"
					className="absolute top-5 right-5 grid size-9 place-items-center rounded-full text-text-faint transition-colors hover:bg-surface hover:text-text"
				>
					<X className="size-5" strokeWidth={1.75} aria-hidden />
				</a>
			)}

			<h1 className="display dot text-center text-[1.875rem] leading-tight">{title}</h1>
			<p className="mt-3 text-center text-[0.9375rem] text-text-muted">{subtitle}</p>

			{children}
		</div>
	);
}
