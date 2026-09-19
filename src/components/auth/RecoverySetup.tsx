import { Check, Copy, KeyRound, ShieldCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState, type SubmitEvent } from 'react';
import {
	authErrorMessage,
	confirmRecoverySetup,
	startRecoverySetup
} from '../../lib/auth-client';
import { FormError } from './FormError';
import { SubmitButton } from './SubmitButton';

interface Props {
	onDone: () => void;
	onSkip: () => void;
	/**
	 * Better Auth re-checks the password before handing out a TOTP secret — enrolling a
	 * recovery factor is exactly the action worth confirming isn't someone on a borrowed
	 * session. Sign-up passes the one just chosen so the user is not asked twice.
	 */
	password: string;
}

/**
 * The recovery step, offered immediately after a passkey is registered.
 *
 * A passkey lives on one device. Decision 2 removed the password-reset email that used
 * to be the way back after losing it, so without this a lost phone is a lost account —
 * which is why it is offered here, at the one moment the user is definitely paying
 * attention, rather than buried in a settings screen nobody visits.
 *
 * Skippable, because forcing it would trade one abandoned sign-up for another.
 */
export function RecoverySetup({ onDone, onSkip, password }: Props) {
	const [secret, setSecret] = useState<{ uri: string; secret: string } | null>(null);
	const [token, setToken] = useState('');
	const [copied, setCopied] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let live = true;
		startRecoverySetup(password)
			/*
			 * Better Auth returns only the otpauth:// URI. The bare secret is the `secret`
			 * parameter inside it, and it is shown so the code can be typed by hand when a
			 * camera is not to hand.
			 */
			.then(({ totpURI }) => {
				if (!live) return;
				const bare = new URL(totpURI).searchParams.get('secret') ?? '';
				setSecret({ uri: totpURI, secret: bare });
			})
			.catch((cause: unknown) => live && setError(authErrorMessage(cause)));
		return () => {
			live = false;
		};
	}, [password]);

	async function confirm(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setPending(true);
		try {
			await confirmRecoverySetup(token);
			onDone();
		} catch (cause) {
			setError(authErrorMessage(cause));
			setPending(false);
		}
	}

	async function copySecret() {
		if (!secret) return;
		try {
			await navigator.clipboard.writeText(secret.secret);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// Clipboard access can be refused; the secret is on screen to type either way.
		}
	}

	return (
		<div className="mt-8">
			<div className="flex items-start gap-3 rounded-control bg-surface px-4 py-3.5">
				<ShieldCheck className="mt-0.5 size-[1.125rem] shrink-0 text-accent-text" strokeWidth={1.75} aria-hidden />
				<p className="text-[0.8125rem] leading-relaxed text-text-muted">
					Scan this with an authenticator app. It is how you get back in if you lose the device
					holding your passkey.
				</p>
			</div>

			{secret ? (
				<>
					<div className="mt-6 flex justify-center">
						<div className="rounded-control border border-border-strong bg-white p-4">
							<QRCodeSVG value={secret.uri} size={168} level="M" marginSize={0} />
						</div>
					</div>

					<div className="mt-5">
						<p className="text-center text-[0.75rem] uppercase tracking-[0.12em] text-text-faint">
							Or enter this code by hand
						</p>
						<button
							type="button"
							onClick={copySecret}
							className="mt-2 flex w-full items-center justify-center gap-2 rounded-control border border-border px-4 py-3 font-mono text-[0.8125rem] tracking-[0.08em] text-text transition-colors hover:bg-surface"
						>
							<span className="break-all">{secret.secret}</span>
							{copied ? (
								<Check className="size-4 shrink-0 text-positive" strokeWidth={2} aria-hidden />
							) : (
								<Copy className="size-4 shrink-0 text-text-faint" strokeWidth={1.75} aria-hidden />
							)}
							<span className="sr-only">{copied ? 'Copied' : 'Copy the setup code'}</span>
						</button>
					</div>

					<form onSubmit={confirm} className="mt-6 flex flex-col gap-4">
						<div>
							<label htmlFor="totp-setup" className="sr-only">
								Six-digit code from your authenticator app
							</label>
							<div className="relative">
								<KeyRound
									aria-hidden
									strokeWidth={1.75}
									className="pointer-events-none absolute left-4 top-1/2 size-[1.125rem] -translate-y-1/2 text-text-faint"
								/>
								<input
									id="totp-setup"
									value={token}
									onChange={(event) => setToken(event.target.value)}
									inputMode="numeric"
									autoComplete="one-time-code"
									maxLength={6}
									required
									placeholder="123456"
									className="h-[3.25rem] w-full rounded-control border border-border-strong bg-surface-raised pl-12 pr-4 font-mono text-[0.9375rem] tracking-[0.3em] text-text transition-colors placeholder:tracking-[0.3em] placeholder:text-text-faint focus:border-accent focus:outline-none"
								/>
							</div>
						</div>

						<FormError message={error} />

						<SubmitButton
							label="Turn on recovery"
							pendingLabel="Checking…"
							pending={pending}
							disabled={token.length !== 6}
						/>
					</form>
				</>
			) : (
				<FormError message={error} />
			)}

			<button
				type="button"
				onClick={onSkip}
				className="mt-5 w-full text-center text-[0.875rem] text-text-muted underline decoration-dotted underline-offset-4 transition-colors hover:text-text"
			>
				Skip for now
			</button>
		</div>
	);
}
