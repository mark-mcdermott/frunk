import { KeyRound, Mail } from 'lucide-react';
import { useEffect, useState, type SubmitEvent } from 'react';
import {
	authErrorMessage,
	browserSupportsWebAuthn,
	recoverWithCode,
	registerPasskey,
	signInWithPasskey
} from '../../lib/auth-client';
import { setUser } from '../../stores/user';
import { AuthCard } from './AuthCard';
import { AuthField } from './AuthField';
import { DemoLink } from './DemoLink';
import { AFTER_AUTH } from './destination';
import { FormError } from './FormError';
import { SubmitButton } from './SubmitButton';

/**
 * `passkey` is the normal way in. `recover` is the way in with no passkey to hand, and
 * `recovered` is the state it leaves you in: signed in, but still with nothing on this
 * device — so the one thing worth doing next is offered right there.
 */
type Mode = 'passkey' | 'recover' | 'recovered';

const COPY: Record<Mode, { title: string; subtitle: string; label: string; pendingLabel: string }> =
	{
		passkey: {
			title: 'Welcome back',
			subtitle: 'Sign in to access your Frunk.',
			label: 'Sign in',
			pendingLabel: 'Waiting for your passkey…'
		},
		recover: {
			title: 'Lost your passkey',
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
 * The mock's password field and its Google / Apple / GitHub row are superseded by
 * Decision 2; "Forgot password?" becomes "Lost your passkey?", which is the same
 * promise about a different secret.
 */
export function SignInForm() {
	const [mode, setMode] = useState<Mode>('passkey');
	const [email, setEmail] = useState('');
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
				setUser(await recoverWithCode(email, token));
				setMode('recovered');
			} else {
				// `recovered` registers onto the session just opened; `passkey` signs in.
				setUser(
					mode === 'recovered' ? await registerPasskey(email) : await signInWithPasskey(email)
				);
				window.location.assign(AFTER_AUTH);
				return;
			}
		} catch (cause) {
			setError(authErrorMessage(cause));
		} finally {
			setPending(false);
		}
	}

	const copy = COPY[mode];

	return (
		<AuthCard title={copy.title} subtitle={copy.subtitle}>
			<form onSubmit={submit} className="mt-8 flex flex-col gap-4">
				<AuthField
					id="email"
					label="Email address"
					icon={Mail}
					type="email"
					autoComplete="username webauthn"
					required
					readOnly={mode === 'recovered'}
					placeholder="Email address"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
				/>

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
							setMode(mode === 'recover' ? 'passkey' : 'recover');
							setError(null);
						}}
						className="self-end text-[0.875rem] text-accent-text underline decoration-dotted underline-offset-4 transition-opacity hover:opacity-80"
					>
						{mode === 'recover' ? 'Back to sign in' : 'Lost your passkey?'}
					</button>
				)}

				<FormError
					message={
						supported || mode === 'recover'
							? error
							: 'This browser cannot use passkeys. Sign in with your recovery code instead.'
					}
				/>

				<SubmitButton
					label={copy.label}
					pendingLabel={copy.pendingLabel}
					pending={pending}
					disabled={!supported && mode !== 'recover'}
				/>
			</form>

			{mode === 'passkey' && (
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
