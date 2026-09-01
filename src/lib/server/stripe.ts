import Stripe from 'stripe';

export function createStripe(secretKey: string) {
	return new Stripe(secretKey, {
		apiVersion: '2025-12-15.clover'
	});
}

// Generate a unique ID for database records
export function generateId(): string {
	return crypto.randomUUID();
}
