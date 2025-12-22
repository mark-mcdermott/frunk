import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { createStripe } from '$lib/server/stripe';
import { db } from '$lib/server/db';
import { orders } from '$lib/server/db/schema';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const stripeSecretKey = env.STRIPE_SECRET_KEY;
	const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
	const printfulApiKey = env.PRINTFUL_API_KEY;

	if (!stripeSecretKey || !webhookSecret) {
		console.error('[Webhook] Missing Stripe configuration');
		error(500, 'Webhook not configured');
	}

	const stripe = createStripe(stripeSecretKey);
	const signature = request.headers.get('stripe-signature');

	if (!signature) {
		console.error('[Webhook] Missing stripe-signature header');
		error(400, 'Missing signature');
	}

	const body = await request.text();

	let event;
	try {
		event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
	} catch (err) {
		console.error('[Webhook] Signature verification failed:', err);
		error(400, 'Invalid signature');
	}

	console.log('[Webhook] Received event:', event.type);

	if (event.type === 'checkout.session.completed') {
		const session = event.data.object;
		const orderId = session.metadata?.orderId;

		if (!orderId) {
			console.error('[Webhook] No orderId in session metadata');
			return json({ received: true });
		}

		console.log('[Webhook] Processing order:', orderId);

		// Get order from database
		const [order] = await db.select().from(orders).where(eq(orders.id, orderId));

		if (!order) {
			console.error('[Webhook] Order not found:', orderId);
			return json({ received: true });
		}

		// Update order with email and payment info
		const customerEmail = session.customer_details?.email || '';
		const shippingAddress = session.shipping_details?.address;
		const shippingName = session.shipping_details?.name;

		await db.update(orders).set({
			email: customerEmail,
			status: 'paid',
			stripePaymentIntentId: session.payment_intent as string,
			shippingAddress: shippingAddress ? {
				name: shippingName || '',
				address1: shippingAddress.line1 || '',
				address2: shippingAddress.line2 || '',
				city: shippingAddress.city || '',
				state: shippingAddress.state || '',
				zip: shippingAddress.postal_code || '',
				country: shippingAddress.country || ''
			} : null,
			shipping: session.shipping_cost?.amount_total || 0,
			total: session.amount_total || order.total,
			updatedAt: new Date()
		}).where(eq(orders.id, orderId));

		console.log('[Webhook] Order updated with payment info');

		// Create Printful order if API key is configured
		if (printfulApiKey && shippingAddress) {
			try {
				const printfulOrder = await createPrintfulOrder(
					printfulApiKey,
					order,
					{
						name: shippingName || '',
						address1: shippingAddress.line1 || '',
						address2: shippingAddress.line2 || '',
						city: shippingAddress.city || '',
						state: shippingAddress.state || '',
						zip: shippingAddress.postal_code || '',
						country: shippingAddress.country || '',
						email: customerEmail
					}
				);

				if (printfulOrder?.id) {
					await db.update(orders).set({
						printfulOrderId: String(printfulOrder.id),
						status: 'processing',
						updatedAt: new Date()
					}).where(eq(orders.id, orderId));

					console.log('[Webhook] Printful order created:', printfulOrder.id);
				}
			} catch (printfulError) {
				console.error('[Webhook] Printful order failed:', printfulError);
				// Don't fail the webhook - order is paid, we can manually fulfill
			}
		} else {
			console.log('[Webhook] Skipping Printful order - missing API key or shipping address');
		}
	}

	return json({ received: true });
};

interface OrderItem {
	printfulSyncVariantId: string;
	quantity: number;
}

interface ShippingAddress {
	name: string;
	address1: string;
	address2: string;
	city: string;
	state: string;
	zip: string;
	country: string;
	email: string;
}

async function createPrintfulOrder(
	apiKey: string,
	order: { id: string; items: unknown },
	shipping: ShippingAddress
) {
	const items = order.items as OrderItem[];

	const printfulItems = items.map(item => ({
		sync_variant_id: parseInt(item.printfulSyncVariantId),
		quantity: item.quantity
	}));

	const response = await fetch('https://api.printful.com/orders', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
			'X-PF-Store-Id': '17418567' // Frunk store ID
		},
		body: JSON.stringify({
			external_id: order.id,
			recipient: {
				name: shipping.name,
				address1: shipping.address1,
				address2: shipping.address2,
				city: shipping.city,
				state_code: shipping.state,
				zip: shipping.zip,
				country_code: shipping.country,
				email: shipping.email
			},
			items: printfulItems
		})
	});

	const result = await response.json();

	if (!response.ok) {
		console.error('[Webhook] Printful API error:', result);
		throw new Error(result.error?.message || 'Printful order failed');
	}

	console.log('[Webhook] Printful response:', JSON.stringify(result, null, 2));
	return result.result;
}
