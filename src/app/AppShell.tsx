import { Monitor } from 'lucide-react';
import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router';
import { useSession } from '../lib/auth-client';
import { initial } from '../lib/user';

/**
 * The signed-in chrome, built to `docs/mocks/vehicles-index.webp`.
 *
 * Flush and dark, unlike the marketing header's floating white card (DESIGN.md §4).
 * Active nav is accent text with a small violet dot centred beneath it — the same dot
 * that terminates the wordmark, which is the brand signature.
 *
 * Only sections with a route are listed. The mock also draws Repairs and Notes; adding
 * them before their screens exist would put dead links inside the app, which is the
 * thing the marketing nav was just cleaned up to avoid.
 *
 * Two icons from the mock's cluster are absent: the cart went with the store
 * (Decision 6), and lucide no longer ships brand marks, so there is no GitHub glyph —
 * labelling some other icon "GitHub" would be worse than omitting it, and the footer
 * already carries that link.
 */

const SECTIONS = [
	{ label: 'Vehicles', to: '/vehicles' },
	{ label: 'Vendors', to: '/vendors' }
];

/** `Home › Vehicles`, from the path — muted, chevrons, current page not a link. */
function Breadcrumbs() {
	const { pathname } = useLocation();
	const section = SECTIONS.find((s) => pathname.startsWith(s.to));

	return (
		<nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[0.8125rem]">
			<a href="/" className="text-text-muted transition-colors hover:text-text">
				Home
			</a>
			{section && (
				<>
					<span aria-hidden className="text-text-faint">
						›
					</span>
					<span aria-current="page" className="text-text">
						{section.label}
					</span>
				</>
			)}
		</nav>
	);
}

export function AppShell({ children }: { children: ReactNode }) {
	const { data } = useSession();
	const user = data?.user;

	return (
		<div className="surface-dark flex min-h-screen flex-col">
			<header className="border-b border-border">
				<div className="mx-auto flex max-w-[1400px] items-center gap-8 px-6 py-5 sm:px-10 lg:px-16">
					<a href="/" className="wordmark shrink-0 text-lg" aria-label="Frunk, home">
						FRUNK
					</a>

					<nav aria-label="Sections" className="hidden items-center gap-8 md:flex">
						{SECTIONS.map((section) => (
							<NavLink
								key={section.to}
								to={section.to}
								className={({ isActive }) =>
									`relative py-1 text-[0.9375rem] transition-colors ${
										isActive ? 'text-accent-bright' : 'text-text-muted hover:text-text'
									}`
								}
							>
								{({ isActive }) => (
									<>
										{section.label}
										{isActive && (
											<span
												aria-hidden
												className="absolute -bottom-1.5 left-1/2 size-[5px] -translate-x-1/2 rounded-full bg-accent-bright"
											/>
										)}
									</>
								)}
							</NavLink>
						))}
					</nav>

					<div className="ml-auto flex items-center gap-5">
						<button
							type="button"
							aria-label="Theme"
							className="text-text-muted transition-colors hover:text-text"
						>
							<Monitor className="size-[1.125rem]" strokeWidth={1.75} aria-hidden />
						</button>

						{user && (
							<span
								aria-label={user.name || user.email}
								title={user.name || user.email}
								className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-[0.8125rem] font-semibold text-text"
							>
								{initial({
									id: user.id,
									email: user.email,
									name: user.name ?? '',
									image: user.image ?? null,
									roles: [],
									emailVerified: Boolean(user.emailVerified),
									twoFactorEnabled: false
								})}
							</span>
						)}
					</div>
				</div>
			</header>

			<div className="mx-auto w-full max-w-[1400px] px-6 pt-6 sm:px-10 lg:px-16">
				<Breadcrumbs />
			</div>

			<main className="mx-auto w-full max-w-[1400px] flex-1 px-6 pb-24 pt-6 sm:px-10 lg:px-16">
				{children}
			</main>
		</div>
	);
}
