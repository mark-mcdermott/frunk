import { AwsClient } from 'aws4fetch';
import { env } from '$env/dynamic/private';

const AWS_REGION = 'us-east-1';

function getAwsClient() {
	if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
		throw new Error('AWS credentials not configured');
	}
	return new AwsClient({
		accessKeyId: env.AWS_ACCESS_KEY_ID,
		secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
		region: AWS_REGION
	});
}

export async function sendEmail({
	to,
	subject,
	html,
	text
}: {
	to: string;
	subject: string;
	html: string;
	text?: string;
}) {
	const aws = getAwsClient();
	const fromEmail = env.SES_FROM_EMAIL || 'noreply@frunk.cloud';

	const params = new URLSearchParams({
		Action: 'SendEmail',
		Version: '2010-12-01',
		'Destination.ToAddresses.member.1': to,
		'Message.Subject.Data': subject,
		'Message.Body.Html.Data': html,
		'Message.Body.Html.Charset': 'UTF-8',
		'Source': fromEmail
	});

	if (text) {
		params.set('Message.Body.Text.Data', text);
		params.set('Message.Body.Text.Charset', 'UTF-8');
	}

	const response = await aws.fetch(`https://email.${AWS_REGION}.amazonaws.com/`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: params.toString()
	});

	if (!response.ok) {
		const errorText = await response.text();
		console.error('SES error:', errorText);
		throw new Error(`Failed to send email: ${response.status}`);
	}

	return response;
}

export async function sendVerificationEmail(email: string, token: string, baseUrl: string) {
	const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

	await sendEmail({
		to: email,
		subject: 'Verify your email address',
		html: `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
			</head>
			<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; background-color: #f5f5f5;">
				<div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
					<h1 style="margin: 0 0 24px; font-size: 24px; color: #111;">Verify your email</h1>
					<p style="margin: 0 0 24px; color: #666; line-height: 1.6;">
						Thanks for signing up! Please click the button below to verify your email address.
					</p>
					<a href="${verifyUrl}" style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
						Verify Email
					</a>
					<p style="margin: 24px 0 0; color: #999; font-size: 14px; line-height: 1.6;">
						If you didn't create an account, you can safely ignore this email.
					</p>
					<p style="margin: 16px 0 0; color: #999; font-size: 12px;">
						This link expires in 24 hours.
					</p>
				</div>
			</body>
			</html>
		`,
		text: `Verify your email address by clicking this link: ${verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you didn't create an account, you can safely ignore this email.`
	});
}

export function generateVerificationToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sendContactEmail({
	name,
	email,
	message
}: {
	name: string;
	email: string;
	message: string;
}) {
	const toEmail = env.CONTACT_EMAIL || 'hello@frunk.app';

	await sendEmail({
		to: toEmail,
		subject: `Contact Form: Message from ${name}`,
		html: `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
			</head>
			<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; background-color: #f5f5f5;">
				<div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
					<h1 style="margin: 0 0 24px; font-size: 24px; color: #111;">New Contact Form Submission</h1>
					<p style="margin: 0 0 8px; color: #666;"><strong>From:</strong> ${name}</p>
					<p style="margin: 0 0 24px; color: #666;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #3b82f6;">${email}</a></p>
					<div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 0 0 24px;">
						<p style="margin: 0; color: #333; line-height: 1.6; white-space: pre-wrap;">${message}</p>
					</div>
					<a href="mailto:${email}?subject=Re: Your message to Frunk" style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
						Reply to ${name}
					</a>
				</div>
			</body>
			</html>
		`,
		text: `New Contact Form Submission\n\nFrom: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
	});
}
