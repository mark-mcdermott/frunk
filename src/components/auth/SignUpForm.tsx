import { Lock, Mail, User } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { authErrorMessage, signUp } from '../../lib/auth-client';
import { AuthCard } from './AuthCard';
import { AuthField } from './AuthField';
import { DemoLink } from './DemoLink';
import { AFTER_AUTH } from './destination';
import { FormError } from './FormError';
import { RecoverySetup } from './RecoverySetup';
import { SubmitButton } from './SubmitButton';

type Step = 'account' | 'recovery';

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
 */
export function SignUpForm() {
	const [step, setStep] = useState<Step>('account');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [name, setName] = useState('');
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function createAccount(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setPending(true);
		try {
			await signUp(email, password, name);
			setStep('recovery');
		} catch (cause) {
			setError(authErrorMessage(cause));
		} finally {
			setPending(false);
		}
	}

	const done = () => window.location.assign(AFTER_AUTH);

	if (step === 'recovery') {
		return (
			<AuthCard
				title="One last step"
				subtitle="Set up a recovery code, in case you lose the device holding your passkey."
			>
				<RecoverySetup onDone={done} onSkip={done} password={password} />
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
