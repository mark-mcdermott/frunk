import { Monitor } from 'lucide-react';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { toSessionUser, useSession } from '../lib/auth-client';
import { isAdmin } from '../lib/roles';
import { initial } from '../lib/user';

/**
 * The signed-in chrome, built to `docs/mocks/vehicles-index.webp`.
 *
 * Flush and dark, unlike the marketing header's floating white card (DESIGN.md §4).
 * Active nav is accent text with a small violet dot centred beneath it — the same dot
 * that terminates the wordmark, which is the brand signature.
 *
 * Only sections with a route are listed — a link to a screen that does not exist is the
 * dead-link problem the marketing nav was cleaned up to avoid.
 *
 * Two icons from the mock's cluster are absent: the cart went with the store
 * (Decision 6), and lucide no longer ships brand marks, so there is no GitHub glyph —
 * labelling some other icon "GitHub" would be worse than omitting it, and the footer
 * already carries that link.
 */

const SECTIONS = [
	{ label: 'Vehicles', to: '/vehicles' },
	{ label: 'Repairs', to: '/repairs' },
	{ label: 'Notes', to: '/notes' },
	{ label: 'Vendors', to: '/vendors' }
];

/**
 * Hiding the entry is presentation, not protection — the auth boundary stays at the
 * API (`requireAdmin`), and a non-admin who types /users in by hand gets its 403
 * rendered as an error state. The nav check just keeps the link honest.
 */
const ADMIN_SECTIONS = [{ label: 'Users', to: '/users' }];

export interface Crumb {
	label: string;
	to?: string;
}

const SetCrumbs = createContext<(crumbs: Crumb[]) => void>(() => {});

/**
 * A screen declares the trail below its section: `Home › Vehicles › 1974 AMC Gremlin`.
 *
 * The header sits outside the router outlet, so the entity name it needs is only known
 * once the page has loaded it — hence a context rather than a prop. `key` is the
 * serialized trail, so the effect re-runs when the labels actually change and not on
 * every render that rebuilds the array.
 */
export function useCrumbs(crumbs: Crumb[]) {
	const set = useContext(SetCrumbs);
	const key = JSON.stringify(crumbs);

	useEffect(() => {
		set(crumbs);
		return () => set([]);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key, set]);
}

const CRUMB_LINK = 'text-text-muted transition-colors hover:text-text';

/** `/` is an Astro page outside the router, so it needs a real navigation. */
function CrumbLink({ to, children }: { to: string; children: ReactNode }) {
	return to === '/' ? (
		<a href={to} className={CRUMB_LINK}>
			{children}
		</a>
	) : (
		<Link to={to} className={CRUMB_LINK}>
			{children}
		</Link>
	);
}

function Breadcrumbs({ trail }: { trail: Crumb[] }) {
	const { pathname } = useLocation();
	const section = [...SECTIONS, ...ADMIN_SECTIONS].find((s) => pathname.startsWith(s.to));

	const crumbs: Crumb[] = [
		{ label: 'Home', to: '/' },
		...(section ? [{ label: section.label, to: section.to }] : []),
		...trail
	];

	return (
		<nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-[0.8125rem]">
			{crumbs.map((crumb, index) => {
				const last = index === crumbs.length - 1;

				return (
					<span key={`${crumb.label}-${index}`} className="flex items-center gap-2">
						{index > 0 && (
							<span aria-hidden className="text-text-faint">
								›
							</span>
						)}
						{last || !crumb.to ? (
							<span aria-current={last ? 'page' : undefined} className="text-text">
								{crumb.label}
							</span>
						) : (
							<CrumbLink to={crumb.to}>{crumb.label}</CrumbLink>
						)}
					</span>
				);
			})}
		</nav>
	);
}

export function AppShell({ children }: { children: ReactNode }) {
	const { data } = useSession();
	const user = data?.user ? toSessionUser(data.user) : null;
	const sections = user && isAdmin(user.roles) ? [...SECTIONS, ...ADMIN_SECTIONS] : SECTIONS;
	const [trail, setTrail] = useState<Crumb[]>([]);
	const set = useMemo(() => (crumbs: Crumb[]) => setTrail(crumbs), []);

	return (
		<div className="surface-dark flex min-h-screen flex-col">
			<header className="border-b border-border">
				<div className="mx-auto flex max-w-[1400px] items-center gap-8 px-6 py-5 sm:px-10 lg:px-16">
					<a href="/" className="wordmark shrink-0 text-lg" aria-label="Frunk, home">
						FRUNK
					</a>

					<nav aria-label="Sections" className="hidden items-center gap-8 md:flex">
						{sections.map((section) => (
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
								{initial(user)}
							</span>
						)}
					</div>
				</div>
			</header>

			<div className="mx-auto w-full max-w-[1400px] px-6 pt-6 sm:px-10 lg:px-16">
				<Breadcrumbs trail={trail} />
			</div>

			<main className="mx-auto w-full max-w-[1400px] flex-1 px-6 pb-24 pt-6 sm:px-10 lg:px-16">
				<SetCrumbs.Provider value={set}>{children}</SetCrumbs.Provider>
			</main>
		</div>
	);
}
