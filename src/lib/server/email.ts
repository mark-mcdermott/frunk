import { Resend } from 'resend';
import { CONTACT_EMAIL, RESEND_API_KEY } from 'astro:env/server';

/**
 * The one place frunk sends mail from.
 *
 * Both callers go through `sendEmail` — the contact form (Phase 5) and, once Decision 2's
 * Better Auth rework lands, `sendVerificationEmail`. Keeping the transport behind one
 * function is what makes the provider a contained change: SES was swapped for Resend before
 * a line of it shipped, and the argument for SES that survives — cost at volume — is worth
 * revisiting behind this seam rather than being locked out now.
 *
 * DNS is split by role (PORT-PLAN Decision 1): Resend signs as `frunk.cloud` via the
 * `resend._domainkey` DKIM record and uses `send.frunk.cloud` as the envelope sender, while
 * the apex MX belongs to Namecheap's forwarding so `hello@frunk.cloud` still reaches a human.
 * That separation is why sending here cannot break receiving there.
 */

/** Sending needs no mailbox. Replies are steered with `replyTo`, which does. */
const FROM = 'Frunk <noreply@frunk.cloud>';

/** Matches the address in the footer, on the privacy page, and in `legacy/`'s contact form. */
const DEFAULT_CONTACT = 'hello@frunk.cloud';

export interface EmailMessage {
	to: string;
	subject: string;
	html: string;
	text: string;
	/** Where a human reply should go — the sender, not the no-reply we posted from. */
	replyTo?: string;
}

/**
 * Throws rather than returning a failure flag, so a caller cannot ignore a failed send
 * by accident.
 *
 * ⚠️ **Better Auth does not honour that for verification mail.** It runs
 * `sendVerificationEmail` as a *background task*, so this throw is logged
 * ("Failed to run background task") and never reaches the request — sign-up still
 * answers 200, the user row is created, and no verification row is written. A Resend
 * outage therefore produces an account that looks created and can never be verified.
 *
 * The recovery path is Better Auth's own `POST /api/auth/send-verification-email`, so
 * **the sign-up UI must offer "resend verification email"** rather than treating a 200
 * as proof that mail went out. Verified against 1.7.5 on 2026-09-19.
 */
/** Whether mail can be sent at all — the digest skips the channel rather than throwing per person. */
export const emailConfigured = () => Boolean(RESEND_API_KEY);

export async function sendEmail({ to, subject, html, text, replyTo }: EmailMessage) {
	if (!RESEND_API_KEY) {
		throw new Error('RESEND_API_KEY is not set — refusing to pretend the message was sent');
	}

	const { data, error } = await new Resend(RESEND_API_KEY).emails.send({
		from: FROM,
		to,
		subject,
		html,
		text,
		...(replyTo ? { replyTo } : {})
	});

	if (error) throw new Error(`Resend rejected the message: ${error.message}`);
	return data;
}

export interface ContactMessage {
	name: string;
	email: string;
	subject: string;
	message: string;
}

const SUBJECT_LABELS: Record<string, string> = {
	general: 'General enquiry',
	support: 'Support',
	feedback: 'Feedback',
	privacy: 'Privacy'
};

/**
 * Escaped because the body is attacker-controlled free text and lands in an HTML email.
 * The plain-text part carries the same content for clients that prefer it.
 */
function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

export async function sendContactEmail({ name, email, subject, message }: ContactMessage) {
	const label = SUBJECT_LABELS[subject] ?? subject;
	const to = CONTACT_EMAIL ?? DEFAULT_CONTACT;

	const text = [
		`From: ${name} <${email}>`,
		`Subject: ${label}`,
		'',
		message,
		'',
		'— sent from the frunk.cloud contact form'
	].join('\n');

	const html = `
		<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#0b0f18">
			<p style="margin:0 0 4px"><strong>${escapeHtml(name)}</strong> &lt;${escapeHtml(email)}&gt;</p>
			<p style="margin:0 0 20px;color:#5b6472">${escapeHtml(label)}</p>
			<div style="white-space:pre-wrap;border-left:3px solid #6438cc;padding-left:16px">${escapeHtml(message)}</div>
			<p style="margin:24px 0 0;font-size:13px;color:#8b93a1">
				Sent from the frunk.cloud contact form. Reply directly to reach ${escapeHtml(name)}.
			</p>
		</div>
	`.trim();

	return sendEmail({ to, subject: `Frunk contact — ${label}`, html, text, replyTo: email });
}
