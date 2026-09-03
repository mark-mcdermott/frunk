import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { ENCRYPTION_KEY } from 'astro:env/server';

/**
 * At-rest encryption for the one secret frunk stores: the TOTP seed.
 *
 * A TOTP seed is symmetric — anything that can read it can mint valid codes, and a
 * code is enough to recover an account (`api/auth/totp/recover`). So a database dump
 * on its own must not be sufficient to sign in as someone, which is exactly what
 * storing the seed in plaintext would allow.
 *
 * AES-256-GCM, key derived with scrypt from `ENCRYPTION_KEY`. The auth tag is
 * appended to the ciphertext, so a tampered value fails to decrypt rather than
 * decrypting to garbage.
 */

const ALGORITHM = 'aes-256-gcm';
const TAG_BYTES = 16;
const IV_BYTES = 12;
const SALT = 'frunk-totp';

/**
 * Dev has no `ENCRYPTION_KEY`, and demanding one would mean nobody can run the app
 * without ceremony. Production is a different matter: `assertProductionSecrets` in
 * `relying-party.ts` refuses to serve an auth ceremony over https without a real key,
 * so this fallback can only ever be reached locally.
 */
const DEV_KEY = 'frunk-dev-insecure-encryption-key';

export const hasEncryptionKey = Boolean(ENCRYPTION_KEY);

function derivedKey(): Buffer {
	return scryptSync(ENCRYPTION_KEY ?? DEV_KEY, SALT, 32);
}

/**
 * Packs iv and ciphertext into one string for a single text column. Both halves are
 * base64, which never contains ':', so the split is unambiguous.
 */
export function sealSecret(plaintext: string): string {
	const iv = randomBytes(IV_BYTES);
	const cipher = createCipheriv(ALGORITHM, derivedKey(), iv);
	const body = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
	const sealed = Buffer.concat([body, cipher.getAuthTag()]);
	return `${iv.toString('base64')}:${sealed.toString('base64')}`;
}

export function openSecret(sealed: string): string {
	const separator = sealed.indexOf(':');
	if (separator === -1) throw new Error('Malformed sealed secret');

	const iv = Buffer.from(sealed.slice(0, separator), 'base64');
	const data = Buffer.from(sealed.slice(separator + 1), 'base64');
	const tag = data.subarray(data.length - TAG_BYTES);
	const ciphertext = data.subarray(0, data.length - TAG_BYTES);

	const decipher = createDecipheriv(ALGORITHM, derivedKey(), iv);
	decipher.setAuthTag(tag);
	return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
