import { Mail } from 'lucide-react';
import { useState } from 'react';
import { authErrorMessage, requestPasswordReset } from '../../lib/auth-client';
import { AuthCard } from './AuthCard';
import { AuthField } from './AuthField';
import { FormError } from './FormError';
import { SubmitButton } from './SubmitButton';

/**
 * Asks for the reset mail.
 *
 * The answer is the same whether or not the address has an account. This page is public,
 * and a differing reply names which addresses are registered — a leak nobody notices
 * because the form still looks like it worked.
 */
export function ForgotPasswordForm() {
	const [email, setEmail] = useState('');
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [sent, setSent] = useState(false);

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		setError(null);
		setPending(true);
		try {
			await requestPasswordReset(email);
			setSent(true);
		} catch (cause) {
			setError(authErrorMessage(cause));
		} finally {
			setPending(false);
		}
	}

	if (sent) {
		return (
			<AuthCard
				title="Check your email"
				subtitle="If that address has an account, a reset link is on its way. The link expires shortly."
			>
				<p className="mt-8 text-sm text-ink-soft">
					<a href="/signin" className="underline">
						Back to sign in
					</a>
				</p>
			</AuthCard>
		);
	}

	return (
		<AuthCard title="Reset your password" subtitle="We'll email you a link to choose a new one.">
			<form onSubmit={submit} className="mt-8 flex flex-col gap-4">
				<AuthField
					id="email"
					label="Email address"
					icon={Mail}
					type="email"
					autoComplete="email"
					required
					placeholder="Email address"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
				/>
				{error === null ? null : <FormError message={error} />}
				<SubmitButton label="Email me a link" pendingLabel="Sending…" pending={pending} />
				<p className="text-center text-sm text-ink-soft">
					<a href="/signin" className="underline">
						Back to sign in
					</a>
				</p>
			</form>
		</AuthCard>
	);
}
