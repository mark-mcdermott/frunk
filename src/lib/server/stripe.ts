import Stripe from 'stripe';

export function createStripe(secretKey: string) {
	return new Stripe(secretKey, {
		apiVersion: '2025-04-30.basil'
	});
}

// Generate a unique ID for database records
export function generateId(): string {
	return crypto.randomUUID();
}
