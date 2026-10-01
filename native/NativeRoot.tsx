import type { ReactNode } from 'react';
import { AppRoot } from '@/app/AppRoot';
import { SignInForm } from '@/components/auth/SignInForm';
import { SignUpForm } from '@/components/auth/SignUpForm';

/**
 * The bundled app's root. There are no public pages here — the marketing site stays
 * on the web — so the whole surface is three screens: sign in, sign up, and the applet.
 *
 * **Routing is the path, like the site.** Capacitor serves `index.html` for any path
 * without a file extension, so `/signup`, `/signin` and `/vehicles/…` all arrive here
 * and the code that links between them (`href="/signup"`, the applet's router, the
 * `location.assign('/vehicles')` after signing in) works unchanged. The only native
 * decision is which screen a path means given whether a session is stored.
 */
export type Screen = 'signin' | 'signup' | 'app';

/** Decides the screen and puts the address bar where that screen lives. */
export function screenFor(location: Location, signedIn: boolean): Screen {
	const path = location.pathname;
	if (path === '/signup') return 'signup';
	if (!signedIn || path === '/signin') {
		if (path !== '/signin') window.history.replaceState(null, '', '/signin');
		return 'signin';
	}
	if (path === '/' || path === '/index.html') window.history.replaceState(null, '', '/vehicles');
	return 'app';
}

/** The sign-in page's ground and glow, without the marketing header above it. */
function AuthScreen({ children }: { children: ReactNode }) {
	return (
		<div className="surface-light flex min-h-svh flex-col">
			<main className="relative flex flex-1 items-center justify-center px-5 pt-[calc(2.5rem+env(safe-area-inset-top,0px))] pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))]">
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_45%_at_50%_40%,rgb(100_56_204_/_0.13)_0%,transparent_70%)]"
				/>
				<div className="relative flex w-full flex-col items-center gap-8">
					<span className="wordmark text-xl">FRUNK</span>
					{children}
				</div>
			</main>
		</div>
	);
}

export function NativeRoot({ screen }: { screen: Screen }) {
	if (screen === 'app') return <AppRoot />;
	return <AuthScreen>{screen === 'signup' ? <SignUpForm /> : <SignInForm />}</AuthScreen>;
}
