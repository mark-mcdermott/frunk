import { KeyRound, Lock, Mail } from 'lucide-react';
import { useEffect, useState, type SubmitEvent } from 'react';
import {
	authErrorMessage,
	browserSupportsWebAuthn,
	recoverWithCode,
	registerPasskey,
	signIn,
	signInWithPasskey
} from '../../lib/auth-client';
import { AuthCard } from './AuthCard';
import { AuthField } from './AuthField';
import { DemoLink } from './DemoLink';
import { AFTER_AUTH } from './destination';
import { FormError } from './FormError';
import { SubmitButton } from './SubmitButton';

/**
 * `password` is the normal way in. `recover` is the way in when the second factor is
 * all you have, and `recovered` is the state it leaves you in: signed in, but with
 * nothing on this device — so the one useful next step is offered right there.
 */
type Mode = 'password' | 'recover' | 'recovered';

const COPY: Record<Mode, { title: string; subtitle: string; label: string; pendingLabel: string }> =
	{
		password: {
			title: 'Welcome back',
			subtitle: 'Sign in to access your Frunk.',
			label: 'Sign in',
			pendingLabel: 'Signing in…'
		},
		recover: {
			title: 'Lost your device',
			subtitle: 'Enter the six-digit code from your authenticator app.',
			label: 'Verify code',
			pendingLabel: 'Checking…'
		},
		recovered: {
			title: 'You are back in',
			subtitle: 'Add a passkey to this device so next time is one tap.',
			label: 'Add a passkey',
			pendingLabel: 'Waiting for your passkey…'
		}
	};

/**
 * Sign-in, built to `docs/mocks/sign-in.webp`.
 *
 * Decision 2's move to Better Auth **restores the mock's password field**, which the
 * hand-rolled passkey-only flow had removed. The passkey route is now the secondary
 * button rather than the whole form, and it needs no email: the browser offers the
 * credentials it holds for this origin and the server identifies the account from the
 * one chosen.
 */
export function SignInForm() {
	const [mode, setMode] = useState<Mode>('password');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [token, setToken] = useState('');
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [supported, setSupported] = useState(true);

	useEffect(() => setSupported(browserSupportsWebAuthn()), []);

	async function submit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setPending(true);
		try {
			if (mode === 'recover') {
				await recoverWithCode(token);
				setMode('recovered');
			} else if (mode === 'recovered') {
				// Registers onto the session that recovery just opened.
				await registerPasskey();
				window.location.assign(AFTER_AUTH);
				return;
			} else {
				await signIn(email, password);
				window.location.assign(AFTER_AUTH);
				return;
			}
		} catch (cause) {
			setError(authErrorMessage(cause));
		} finally {
			setPending(false);
		}
	}

	async function usePasskey() {
		setError(null);
		setPending(true);
		try {
			await signInWithPasskey();
			window.location.assign(AFTER_AUTH);
		} catch (cause) {
			setError(authErrorMessage(cause));
			setPending(false);
		}
	}

	const copy = COPY[mode];

	return (
		<AuthCard title={copy.title} subtitle={copy.subtitle}>
			<form onSubmit={submit} className="mt-8 flex flex-col gap-4">
				{mode === 'password' && (
					<>
						<AuthField
							id="email"
							label="Email address"
							icon={Mail}
							type="email"
							autoComplete="username webauthn"
							required
							placeholder="Email address"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
						/>
						<AuthField
							id="password"
							label="Password"
							icon={Lock}
							type="password"
							autoComplete="current-password"
							required
							placeholder="Password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
						/>
					</>
				)}

				{mode === 'recover' && (
					<AuthField
						id="code"
						label="Six-digit code from your authenticator app"
						icon={KeyRound}
						inputMode="numeric"
						autoComplete="one-time-code"
						maxLength={6}
						required
						placeholder="123456"
						value={token}
						onChange={(event) => setToken(event.target.value)}
						className="font-mono tracking-[0.3em] placeholder:tracking-[0.3em]"
					/>
				)}

				{mode !== 'recovered' && (
					<button
						type="button"
						onClick={() => {
							setMode(mode === 'recover' ? 'password' : 'recover');
							setError(null);
						}}
						className="self-end text-[0.875rem] text-accent-text underline decoration-dotted underline-offset-4 transition-opacity hover:opacity-80"
					>
						{mode === 'recover' ? 'Back to sign in' : 'Lost your device?'}
					</button>
				)}

				<FormError message={error} />

				<SubmitButton
					label={copy.label}
					pendingLabel={copy.pendingLabel}
					pending={pending}
					disabled={mode === 'recovered' && !supported}
				/>
			</form>

			{mode === 'password' && supported && (
				<button
					type="button"
					onClick={usePasskey}
					disabled={pending}
					className="mt-3 flex h-14 w-full items-center justify-center gap-3 rounded-[12px] border border-border-strong text-[0.9375rem] font-semibold text-text transition-colors hover:border-text-muted disabled:cursor-not-allowed disabled:opacity-60"
				>
					<KeyRound className="size-[1.125rem]" aria-hidden strokeWidth={1.75} />
					Use a passkey
				</button>
			)}

			{mode === 'password' && (
				<div className="mt-7">
					<DemoLink onError={(message) => setError(message || null)} />
				</div>
			)}

			<p className="mt-7 text-center text-[0.875rem] text-text-muted">
				Don&rsquo;t have an account?{' '}
				<a
					href="/signup"
					className="text-accent-text underline decoration-dotted underline-offset-4 transition-opacity hover:opacity-80"
				>
					Sign up
				</a>
			</p>
		</AuthCard>
	);
}
