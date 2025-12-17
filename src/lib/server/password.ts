// PBKDF2-based password hashing using Web Crypto API
// Compatible with Cloudflare Workers edge runtime

const ITERATIONS = 100000;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes.buffer;
}

export async function hashPassword(password: string): Promise<string> {
	const encoder = new TextEncoder();
	const passwordBuffer = encoder.encode(password);

	// Generate random salt
	const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

	// Import password as key
	const keyMaterial = await crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, [
		'deriveBits'
	]);

	// Derive key using PBKDF2
	const derivedBits = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt: salt,
			iterations: ITERATIONS,
			hash: 'SHA-256'
		},
		keyMaterial,
		KEY_LENGTH * 8
	);

	// Combine salt and hash into a single string
	const saltBase64 = arrayBufferToBase64(salt.buffer);
	const hashBase64 = arrayBufferToBase64(derivedBits);

	return `pbkdf2:${ITERATIONS}:${saltBase64}:${hashBase64}`;
}

export async function verifyPassword(storedHash: string, password: string): Promise<boolean> {
	const encoder = new TextEncoder();
	const passwordBuffer = encoder.encode(password);

	// Parse stored hash
	const parts = storedHash.split(':');
	if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
		return false;
	}

	const iterations = parseInt(parts[1], 10);
	const salt = new Uint8Array(base64ToArrayBuffer(parts[2]));
	const storedHashBuffer = base64ToArrayBuffer(parts[3]);

	// Import password as key
	const keyMaterial = await crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, [
		'deriveBits'
	]);

	// Derive key using same parameters
	const derivedBits = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt: salt,
			iterations: iterations,
			hash: 'SHA-256'
		},
		keyMaterial,
		KEY_LENGTH * 8
	);

	// Compare hashes (constant-time comparison)
	const derivedArray = new Uint8Array(derivedBits);
	const storedArray = new Uint8Array(storedHashBuffer);

	if (derivedArray.length !== storedArray.length) {
		return false;
	}

	let result = 0;
	for (let i = 0; i < derivedArray.length; i++) {
		result |= derivedArray[i] ^ storedArray[i];
	}

	return result === 0;
}
