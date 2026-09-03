import { generateSecret, generateURI, verify } from 'otplib';
import { RP_NAME } from './relying-party';

/**
 * TOTP, used as the recovery factor rather than a second factor: it is what stands in
 * for a passkey the user no longer has (a lost phone, a wiped laptop). Passkeys are
 * per-device, so without a device-independent fallback a single loss is unrecoverable
 * — and Decision 2 removed the password reset email that used to play that part.
 */

export function generateTotpSecret(): string {
	return generateSecret();
}

/** The `otpauth://` URI an authenticator app scans. Also shown as text for manual entry. */
export function totpAuthUri(username: string, secret: string): string {
	return generateURI({ issuer: RP_NAME, label: username, secret });
}

export async function verifyTotp(token: string, secret: string): Promise<boolean> {
	const { valid } = await verify({ secret, token });
	return valid;
}
