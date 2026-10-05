import { Lock } from 'lucide-react';
import { useState } from 'react';
import { authErrorMessage, resetPassword } from '../../lib/auth-client';
import { AuthCard } from './AuthCard';
import { AuthField } from './AuthField';
import { FormError } from './FormError';
import { SubmitButton } from './SubmitButton';

const MIN_LENGTH = 8;

/**
 * Sets the new password from the emailed link.
 *
 * The token is read at submit rather than on mount, so a link that lost its token is
 * reported when somebody acts rather than as an error card they never asked for.
 */
export function ResetPasswordForm() {
	const [password, setPassword] = useState('');
	const [confirm, setConfirm] = useState('');
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [done, setDone] = useState(false);

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		setError(null);

		if (password.length < MIN_LENGTH) {
			setError(`Use at least ${MIN_LENGTH} characters.`);
			return;
		}
		if (password !== confirm) {
			setError('Those two do not match.');
			return;
		}

		const token = new URLSearchParams(window.location.search).get('token');
		if (token === null || token === '') {
			setError('This link is missing its token. Ask for a new reset email.');
			return;
		}

		setPending(true);
		try {
			await resetPassword(token, password);
			setDone(true);
		} catch (cause) {
			setError(authErrorMessage(cause));
		} finally {
			setPending(false);
		}
	}

	if (done) {
		return (
			<AuthCard title="Password changed" subtitle="Sign in with your new password.">
				<p className="text-ink-soft mt-8 text-sm">
					<a href="/signin" className="underline">
						Sign in
					</a>
				</p>
			</AuthCard>
		);
	}

	return (
		<AuthCard title="Choose a new password" subtitle={`At least ${MIN_LENGTH} characters.`}>
			<form onSubmit={submit} className="mt-8 flex flex-col gap-4">
				<AuthField
					id="password"
					label="New password"
					icon={Lock}
					type="password"
					autoComplete="new-password"
					required
					placeholder="New password"
					value={password}
					onChange={(event) => setPassword(event.target.value)}
				/>
				<AuthField
					id="confirm"
					label="Confirm new password"
					icon={Lock}
					type="password"
					autoComplete="new-password"
					required
					placeholder="Confirm new password"
					value={confirm}
					onChange={(event) => setConfirm(event.target.value)}
				/>
				{error === null ? null : <FormError message={error} />}
				<SubmitButton label="Change my password" pendingLabel="Changing…" pending={pending} />
				<p className="text-ink-soft text-center text-sm">
					<a href="/forgot-password" className="underline">
						Request a new link
					</a>
				</p>
			</form>
		</AuthCard>
	);
}
