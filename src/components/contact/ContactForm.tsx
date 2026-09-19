import { useState, type SubmitEvent } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { FormError } from '../auth/FormError';
import { SubmitButton } from '../auth/SubmitButton';

/**
 * The contact form (contact mock).
 *
 * `FormError` and `SubmitButton` come from `components/auth/` — they are generic despite
 * where they live, and duplicating them to avoid an awkward import path would be worse.
 * They are worth promoting to a shared folder, but not while Decision 2's rework is about
 * to rewrite everything around them.
 *
 * `AuthField` is deliberately *not* reused: it renders its label `sr-only` because the
 * auth mocks label by placeholder alone. This mock draws real labels, and a placeholder is
 * not an accessible name — it vanishes as soon as anything is typed.
 */

const SUBJECTS = [
	{ value: 'general', label: 'General enquiry' },
	{ value: 'support', label: 'Support' },
	{ value: 'feedback', label: 'Feedback' },
	{ value: 'privacy', label: 'Privacy' }
] as const;

type FieldErrors = Record<string, string[]>;

const fieldClass =
	'w-full rounded-control border border-border-strong bg-surface-raised px-4 py-3 text-[0.9375rem] text-text transition-colors placeholder:text-text-faint hover:border-[rgb(11_15_24_/_0.28)] focus:border-accent focus:outline-none focus-visible:outline-none';

function Field({
	id,
	label,
	errors,
	children
}: {
	id: string;
	label: string;
	errors?: string[];
	children: React.ReactNode;
}) {
	return (
		<div>
			<label htmlFor={id} className="mb-2 block text-[0.8125rem] font-medium text-text">
				{label}
			</label>
			{children}
			{errors?.length ? (
				<p id={`${id}-error`} className="mt-1.5 text-[0.8125rem] text-destructive">
					{errors[0]}
				</p>
			) : null}
		</div>
	);
}

export function ContactForm() {
	const [pending, setPending] = useState(false);
	const [sent, setSent] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [fields, setFields] = useState<FieldErrors>({});

	async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		setPending(true);
		setError(null);
		setFields({});

		const data = Object.fromEntries(new FormData(event.currentTarget));

		try {
			const response = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(data)
			});

			if (response.ok) {
				setSent(true);
				return;
			}

			const payload: { error?: string; fields?: FieldErrors } = await response
				.json()
				.catch(() => ({}));

			if (response.status === 429) {
				setError("That's a few messages in a short time — try again a little later.");
			} else if (payload.fields) {
				setFields(payload.fields);
			} else {
				setError(payload.error ?? 'Something went wrong. Please try again.');
			}
		} catch {
			setError('Could not reach the server. Check your connection and try again.');
		} finally {
			setPending(false);
		}
	}

	if (sent) {
		return (
			<div role="status" className="flex flex-col items-start gap-4 py-8">
				<CheckCircle2 className="size-8 text-accent-bright" aria-hidden />
				<h3 className="display-sm text-xl">Message sent</h3>
				<p className="text-[0.9375rem] leading-relaxed text-text-muted">
					Thanks — it landed. You&rsquo;ll get a reply at the address you gave.
				</p>
			</div>
		);
	}

	return (
		<form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
			<FormError message={error} />

			<Field id="name" label="Name" errors={fields.name}>
				<input
					id="name"
					name="name"
					required
					maxLength={100}
					autoComplete="name"
					placeholder="Your full name"
					aria-invalid={Boolean(fields.name)}
					aria-describedby={fields.name ? 'name-error' : undefined}
					className={fieldClass}
				/>
			</Field>

			<Field id="email" label="Email" errors={fields.email}>
				<input
					id="email"
					name="email"
					type="email"
					required
					maxLength={254}
					autoComplete="email"
					placeholder="you@example.com"
					aria-invalid={Boolean(fields.email)}
					aria-describedby={fields.email ? 'email-error' : undefined}
					className={fieldClass}
				/>
			</Field>

			<Field id="subject" label="Subject" errors={fields.subject}>
				<select
					id="subject"
					name="subject"
					defaultValue="general"
					aria-invalid={Boolean(fields.subject)}
					aria-describedby={fields.subject ? 'subject-error' : undefined}
					className={fieldClass}
				>
					{SUBJECTS.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
			</Field>

			<Field id="message" label="Message" errors={fields.message}>
				<textarea
					id="message"
					name="message"
					required
					rows={5}
					maxLength={5000}
					placeholder="How can we help?"
					aria-invalid={Boolean(fields.message)}
					aria-describedby={fields.message ? 'message-error' : undefined}
					className={`${fieldClass} resize-y`}
				/>
			</Field>

			<SubmitButton label="Send message" pendingLabel="Sending…" pending={pending} />

			<p className="text-[0.8125rem] leading-relaxed text-text-faint">
				Your message reaches one person, and your address is used only to reply. By submitting
				this form, you agree to our{' '}
				<a href="/privacy" className="text-accent-text underline underline-offset-2">
					Privacy Policy
				</a>
				.
			</p>
		</form>
	);
}
