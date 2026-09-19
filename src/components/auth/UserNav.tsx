import { useStore } from '@nanostores/react';
import { ChevronDown, LogOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { isDemo } from '../../lib/roles';
import { signOut } from '../../lib/auth-client';
import { displayName, initial } from '../../lib/user';
import { $authStatus, $user, loadUser, setUser } from '../../stores/user';

/**
 * The header's account control.
 *
 * This is the only part of a marketing page that differs between visitors, which is
 * exactly why it is an island: the pages stay static HTML, served identically to
 * everyone and cached as such, and this one component asks `/api/auth/me` who is
 * actually looking (docs/PORT-PLAN.md, "Auth boundary is drawn at the API").
 *
 * Colours are the header's own dark-on-white, not the theme tokens — the marketing
 * header is a white card in both themes (DESIGN.md §4).
 */
export function UserNav() {
	const user = useStore($user);
	const status = useStore($authStatus);
	const [open, setOpen] = useState(false);
	const menu = useRef<HTMLDivElement>(null);

	useEffect(() => {
		loadUser();
	}, []);

	useEffect(() => {
		if (!open) return;

		function onPointerDown(event: MouseEvent) {
			if (!menu.current?.contains(event.target as Node)) setOpen(false);
		}
		function onKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') setOpen(false);
		}

		document.addEventListener('mousedown', onPointerDown);
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('mousedown', onPointerDown);
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [open]);

	async function endSession() {
		await signOut();
		setUser(null);
		window.location.assign('/');
	}

	/*
	 * Reserve the control's width while `/api/auth/me` is in flight. Rendering nothing
	 * would let the header settle and then jump, which is the one place a layout shift
	 * is most visible.
	 */
	if (status === 'loading') {
		return <div aria-hidden className="h-11 w-[9.5rem] animate-pulse rounded-full bg-[rgb(11_15_24_/_0.06)]" />;
	}

	if (!user) {
		return (
			<div className="flex items-center gap-2 sm:gap-4">
				<a
					href="/signin"
					className="hidden text-[0.9375rem] text-[rgb(11_15_24_/_0.72)] transition-colors hover:text-[#0b0f18] sm:block"
				>
					Sign in
				</a>
				<a
					href="/signup"
					className="inline-flex items-center gap-2 rounded-full bg-[#0c1019] px-5 py-2.5 text-[0.9375rem] font-semibold text-[#fefefe] transition-opacity hover:opacity-88 sm:px-6 sm:py-3"
				>
					Get started
					<span aria-hidden className="text-xs">
						&#8599;
					</span>
				</a>
			</div>
		);
	}

	const demo = isDemo(user.roles);

	return (
		<div className="flex items-center gap-3" ref={menu}>
			{demo && (
				/* The conversion prompt. A demo account is real (Decision 5), so this is an
				   offer to keep what they already have, not an invitation to start over. */
				<a
					href="/signup"
					className="hidden rounded-full bg-accent/12 px-4 py-2 text-[0.8125rem] font-semibold text-accent transition-colors hover:bg-accent/20 sm:block"
				>
					Keep my data
				</a>
			)}

			<div className="relative">
				<button
					type="button"
					onClick={() => setOpen(!open)}
					aria-expanded={open}
					aria-haspopup="menu"
					className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-[rgb(11_15_24_/_0.05)]"
				>
					{user.image ? (
						<img src={user.image} alt="" className="size-9 rounded-full object-cover" />
					) : (
						<span
							aria-hidden
							className="grid size-9 place-items-center rounded-full bg-[#0c1019] text-[0.8125rem] font-semibold text-[#fefefe]"
						>
							{initial(user)}
						</span>
					)}
					<span className="hidden max-w-[8rem] truncate text-[0.9375rem] text-[#0b0f18] sm:block">
						{displayName(user)}
					</span>
					<ChevronDown className="size-4 text-[rgb(11_15_24_/_0.5)]" strokeWidth={1.75} aria-hidden />
					<span className="sr-only">Account menu</span>
				</button>

				{open && (
					<div
						role="menu"
						className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-60 overflow-hidden rounded-[14px] border border-[rgb(11_15_24_/_0.08)] bg-white shadow-[0_16px_48px_-16px_rgb(11_15_24_/_0.28)]"
					>
						<div className="border-b border-[rgb(11_15_24_/_0.08)] px-4 py-3">
							<p className="truncate text-[0.875rem] font-semibold text-[#0b0f18]">
								{displayName(user)}
							</p>
							<p className="truncate text-[0.75rem] text-[rgb(11_15_24_/_0.62)]">
								{demo ? 'Demo account' : user.email}
							</p>
						</div>

						{demo && (
							<a
								role="menuitem"
								href="/signup"
								className="block px-4 py-3 text-[0.875rem] font-semibold text-accent transition-colors hover:bg-[rgb(11_15_24_/_0.04)] sm:hidden"
							>
								Keep my data
							</a>
						)}

						<button
							role="menuitem"
							type="button"
							onClick={endSession}
							className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[0.875rem] text-[#0b0f18] transition-colors hover:bg-[rgb(11_15_24_/_0.04)]"
						>
							<LogOut className="size-4 text-[rgb(11_15_24_/_0.5)]" strokeWidth={1.75} aria-hidden />
							Sign out
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
