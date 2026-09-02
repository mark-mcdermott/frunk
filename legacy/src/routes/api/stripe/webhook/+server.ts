import { error, text } from '@sveltejs/kit';
import { createStripe } from '$lib/server/stripe';
import { db } from '$lib/server/db';
import { orders } from '$lib/server/db/schema';
import { createPrintfulClient } from '$lib/server/printful';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const stripeSecretKey = env.STRIPE_SECRET_KEY;
	const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
	const printfulApiKey = env.PRINTFUL_API_KEY;

	if (!stripeSecretKey || !webhookSecret) {
		error(500, 'Stripe not configured');
	}

	const stripe = createStripe(stripeSecretKey);

	const body = await request.text();
	const signature = request.headers.get('stripe-signature');

	if (!signature) {
		error(400, 'Missing stripe-signature header');
	}

	let event;
	try {
		event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
	} catch (err) {
		console.error('Webhook signature verification failed:', err);
		error(400, 'Invalid signature');
	}

	// Handle the event
	switch (event.type) {
		case 'checkout.session.completed': {
			const session = event.data.object;

			if (session.payment_status !== 'paid') {
				break;
			}

			if (session.metadata?.type === 'store_order') {
				await handleStoreOrder(session, printfulApiKey);
			}
			break;
		}

		case 'payment_intent.payment_failed': {
			const paymentIntent = event.data.object;
			console.error('Payment failed:', paymentIntent.id);
			break;
		}

		default:
			console.log(`Unhandled event type: ${event.type}`);
	}

	return text('ok');
};

// Handle store order: update order in DB, create Printful order
async function handleStoreOrder(
	session: {
		id: string;
		payment_intent?: string | { id: string } | null;
		amount_total?: number | null;
		shipping_cost?: { amount_total?: number } | null;
		customer_details?: { email?: string | null } | null;
		customer_email?: string | null;
		shipping_details?: {
			name?: string | null;
			address?: {
				line1?: string | null;
				line2?: string | null;
				city?: string | null;
				state?: string | null;
				postal_code?: string | null;
				country?: string | null;
			} | null;
		} | null;
		metadata?: { orderId?: string; type?: string } | null;
	},
	printfulApiKey: string | undefined
) {
	const orderId = session.metadata?.orderId;
	if (!orderId) {
		console.error('No orderId in store order metadata');
		return;
	}

	// Get order from database
	const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

	if (!order) {
		console.error(`Order ${orderId} not found`);
		return;
	}

	const email = session.customer_details?.email || session.customer_email || '';
	const shippingCost = session.shipping_cost?.amount_total || 0;
	const total = session.amount_total || 0;

	// Build shipping address from Stripe session
	const shippingAddress = session.shipping_details?.address
		? {
				name: session.shipping_details.name || '',
				address1: session.shipping_details.address.line1 || '',
				address2: session.shipping_details.address.line2 || '',
				city: session.shipping_details.address.city || '',
				state: session.shipping_details.address.state || '',
				zip: session.shipping_details.address.postal_code || '',
				country: session.shipping_details.address.country || ''
			}
		: null;

	// Update order in database
	await db
		.update(orders)
		.set({
			email,
			status: 'paid',
			stripePaymentIntentId:
				typeof session.payment_intent === 'string'
					? session.payment_intent
					: session.payment_intent?.id,
			shipping: shippingCost,
			total,
			shippingAddress,
			updatedAt: new Date()
		})
		.where(eq(orders.id, orderId));

	console.log(`Store order ${orderId} marked as paid`);

	// Create Printful order if API key is configured
	if (printfulApiKey && shippingAddress) {
		try {
			const printful = createPrintfulClient(printfulApiKey);

			const items = order.items as Array<{
				printfulSyncVariantId: string;
				quantity: number;
			}>;

			// Only create Printful order if we have valid sync variant IDs
			const validItems = items.filter((item) => item.printfulSyncVariantId);
			if (validItems.length === 0) {
				console.log('No Printful sync variant IDs configured - skipping fulfillment');
				return;
			}

			const printfulOrder = await printful.createOrder(
				orderId,
				{
					name: shippingAddress.name,
					address1: shippingAddress.address1,
					address2: shippingAddress.address2,
					city: shippingAddress.city,
					state_code: shippingAddress.state,
					country_code: shippingAddress.country,
					zip: shippingAddress.zip,
					email
				},
				validItems.map((item) => ({
					sync_variant_id: item.printfulSyncVariantId,
					quantity: item.quantity
				})),
				{
					subtotal: order.subtotal,
					shipping: shippingCost,
					total
				}
			);

			// Confirm the order (send to production)
			await printful.confirmOrder(printfulOrder.id);

			// Update order with Printful ID
			await db
				.update(orders)
				.set({
					printfulOrderId: String(printfulOrder.id),
					status: 'processing',
					updatedAt: new Date()
				})
				.where(eq(orders.id, orderId));

			console.log(`Printful order ${printfulOrder.id} created for order ${orderId}`);
		} catch (printfulError) {
			console.error('Failed to create Printful order:', printfulError);
		}
	} else if (!printfulApiKey) {
		console.log('Printful API key not configured - skipping fulfillment');
	}
}
