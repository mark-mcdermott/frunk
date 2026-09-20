import { useStore } from '@nanostores/react';
import { KeyRound, Lock, Mail, User } from 'lucide-react';
import { useEffect, useState, type SubmitEvent } from 'react';
import { authErrorMessage, resendVerification, signOut, signUp } from '../../lib/auth-client';
import { isDemo } from '../../lib/roles';
import { $authStatus, $user, loadUser, setUser } from '../../stores/user';
import { AuthCard } from './AuthCard';
import { AuthField } from './AuthField';
import { DemoLink } from './DemoLink';
import { FormError } from './FormError';
import { SubmitButton } from './SubmitButton';

type Step = 'account' | 'verify';

/**
 * Sign-up, built to `docs/mocks/sign-up.webp`.
 *
 * The mock's password field, strength meter and OAuth row are gone — Decision 2 made
 * passkeys the only factor, so there is nothing to measure the strength of. Its "Full
 * name (optional)" field is gone too: there is no column to put it in, and a field that
 * writes nowhere is worse than an absent one.
 *
 * What the mock does not show is the second step. A passkey is bound to one device, so
 * the offer of a recovery code belongs here, while the user is still in the flow.
 *
 * Nor does it show who is asking. A signed-in demo visitor gets `KeepDemoNotice`
 * instead of the form: the server refuses their sign-up anyway (`config.ts`), and the
 * refusal is better read before anything has been typed.
 */
export function SignUpForm() {
	const user = useStore($user);
	const status = useStore($authStatus);
	const [step, setStep] = useState<Step>('account');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [name, setName] = useState('');
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [resent, setResent] = useState(false);

	useEffect(() => {
		loadUser();
	}, []);

	if (status === 'ready' && user && isDemo(user.roles)) {
		return <KeepDemoNotice />;
	}

	async function createAccount(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setPending(true);
		try {
			await signUp(email, password, name);
			setStep('verify');
		} catch (cause) {
			setError(authErrorMessage(cause));
		} finally {
			setPending(false);
		}
	}

	if (step === 'verify') {
		return (
			<AuthCard
				title="Check your email"
				subtitle={`We sent a verification link to ${email}. Open it to finish setting up your account.`}
			>
				<p className="mt-6 text-[0.875rem] leading-relaxed text-text-muted">
					You will not be able to sign in until the address is verified. The link expires, so if it
					has been a while, send a new one.
				</p>

				<FormError message={error} />

				<button
					type="button"
					disabled={pending}
					onClick={async () => {
						setError(null);
						setPending(true);
						try {
							await resendVerification(email);
							setResent(true);
						} catch (cause) {
							setError(authErrorMessage(cause));
						} finally {
							setPending(false);
						}
					}}
					className="mt-6 flex h-14 w-full items-center justify-center rounded-[12px] border border-border-strong text-[0.9375rem] font-semibold text-text transition-colors hover:border-text-muted disabled:cursor-not-allowed disabled:opacity-60"
				>
					{resent ? 'Sent — check again' : 'Resend verification email'}
				</button>

				<p className="mt-7 text-center text-[0.875rem] text-text-muted">
					Already verified?{' '}
					<a
						href="/signin"
						className="text-accent-text underline decoration-dotted underline-offset-4 transition-opacity hover:opacity-80"
					>
						Sign in
					</a>
				</p>
			</AuthCard>
		);
	}

	return (
		<AuthCard title="Create your account" subtitle="A few details and you are in.">
			<form onSubmit={createAccount} className="mt-8 flex flex-col gap-4">
				<AuthField
					id="name"
					label="Full name"
					icon={User}
					autoComplete="name"
					required
					placeholder="Full name"
					value={name}
					onChange={(event) => setName(event.target.value)}
				/>

				<AuthField
					id="email"
					label="Email address"
					icon={Mail}
					type="email"
					// `webauthn` lets the browser offer a passkey straight from the field.
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
					autoComplete="new-password"
					required
					minLength={8}
					placeholder="Password"
					value={password}
					onChange={(event) => setPassword(event.target.value)}
				/>

				<FormError message={error} />

				<SubmitButton label="Create account" pendingLabel="Creating…" pending={pending} />
			</form>

			<div className="mt-7">
				<DemoLink onError={(message) => setError(message || null)} />
			</div>

			<p className="mt-7 text-center text-[0.875rem] text-text-muted">
				Already have an account?{' '}
				<a
					href="/signin"
					className="text-accent-text underline decoration-dotted underline-offset-4 transition-opacity hover:opacity-80"
				>
					Sign in
				</a>
			</p>
		</AuthCard>
	);
}

/**
 * The sign-up page, seen from inside a demo. Better Auth's sign-up always mints a
 * *second* account — nothing about it promotes the one the visitor is using — so the
 * garage could only be left behind (Decision 5). The two honest exits are offered:
 * the profile's passkey prompt, which converts the account in place, or signing out
 * to start a separate one. Signing out clears the shared user store, so the form
 * takes this card's place without a reload.
 */
function KeepDemoNotice() {
	const [pending, setPending] = useState(false);

	async function startSeparately() {
		setPending(true);
		await signOut();
		setUser(null);
	}

	return (
		<AuthCard
			title="You are in a demo"
			subtitle="This account is already real. Keep it, or start a separate one."
		>
			<p className="mt-6 text-[0.875rem] leading-relaxed text-text-muted">
				Everything in this garage stays if you add a passkey. An email account created here would
				start over empty, so that door stays closed while the demo is signed in.
			</p>

			<a
				href="/profile"
				className="mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-[12px] bg-surface-elevated text-[0.9375rem] font-semibold text-[#fefefe] transition-opacity hover:opacity-90"
			>
				<KeyRound className="size-[1.125rem] text-accent-bright" strokeWidth={1.75} aria-hidden />
				Add a passkey on your profile
			</a>

			<button
				type="button"
				disabled={pending}
				aria-busy={pending}
				onClick={startSeparately}
				className="mt-3 flex h-14 w-full items-center justify-center rounded-[12px] border border-border-strong text-[0.9375rem] font-semibold text-text transition-colors hover:border-text-muted disabled:cursor-not-allowed disabled:opacity-60"
			>
				{pending ? 'Signing out…' : 'Sign out and start a separate account'}
			</button>
		</AuthCard>
	);
}
