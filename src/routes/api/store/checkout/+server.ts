import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { createStripe, generateId } from '$lib/server/stripe';
import { db } from '$lib/server/db';
import { orders } from '$lib/server/db/schema';
import { getProductById, getProductVariant } from '$lib/data/products';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

interface CartItem {
	productId: string;
	variantId: string;
	quantity: number;
}

export const POST: RequestHandler = async ({ request, locals, url }) => {
	try {
		const stripeSecretKey = env.STRIPE_SECRET_KEY;

		if (!stripeSecretKey) {
			console.error('[Checkout] STRIPE_SECRET_KEY not configured');
			error(500, 'Stripe not configured');
		}

		console.log('[Checkout] Stripe key found, parsing request body...');
		const body = await request.json();

		// Support both single item and multiple items
		let cartItems: CartItem[];
		if (body.items && Array.isArray(body.items)) {
			cartItems = body.items;
		} else if (body.productId && body.variantId) {
			cartItems = [{ productId: body.productId, variantId: body.variantId, quantity: body.quantity || 1 }];
		} else {
			error(400, 'Items or product/variant are required');
		}

		if (cartItems.length === 0) {
			error(400, 'Cart is empty');
		}

		console.log('[Checkout] Cart items:', cartItems.length);

		// Validate all items and build order data
		const orderItems: Array<{
			productId: string;
			variantId: string;
			printfulSyncVariantId: string;
			name: string;
			size: string;
			color: string;
			quantity: number;
			price: number;
		}> = [];

		const stripeLineItems: Array<{
			price_data: {
				currency: string;
				product_data: {
					name: string;
					description: string;
					images?: string[];
				};
				unit_amount: number;
			};
			quantity: number;
		}> = [];

		let subtotal = 0;

		for (const item of cartItems) {
			const product = getProductById(item.productId);
			if (!product) {
				error(404, `Product not found: ${item.productId}`);
			}

			const variant = getProductVariant(item.productId, item.variantId);
			if (!variant || !variant.inStock) {
				error(400, `Variant not available: ${item.variantId}`);
			}

			const quantity = item.quantity || 1;
			subtotal += product.price * quantity;

			orderItems.push({
				productId: product.id,
				variantId: variant.id,
				printfulSyncVariantId: variant.printfulSyncVariantId,
				name: product.name,
				size: variant.size,
				color: variant.color,
				quantity,
				price: product.price
			});

			// Get the color-specific image if available
			const productImage = product.colorImages?.[variant.color] || product.images[0];

			stripeLineItems.push({
				price_data: {
					currency: 'usd',
					product_data: {
						name: `${product.name} - ${variant.color} / ${variant.size}`,
						description: product.description,
						...(productImage?.startsWith('http') ? { images: [productImage] } : {})
					},
					unit_amount: product.price
				},
				quantity
			});
		}

		console.log('[Checkout] Products validated, creating Stripe instance...');
		const stripe = createStripe(stripeSecretKey);

		// Create order in database
		const orderId = generateId();
		const shipping = 0; // Will be calculated by Stripe shipping options
		const total = subtotal + shipping;

		console.log('[Checkout] Inserting order into database...');
		try {
			await db.insert(orders).values({
				id: orderId,
				email: '', // Will be populated after Stripe checkout
				userId: locals.user?.uuid || null,
				status: 'pending',
				items: orderItems,
				subtotal,
				shipping,
				total
			});
			console.log('[Checkout] Order inserted, ID:', orderId);
		} catch (dbError) {
			console.error('[Checkout] Database insert failed:', dbError);
			error(500, 'Failed to create order in database');
		}

		console.log('[Checkout] Creating Stripe checkout session...');
		let session;
		try {
			session = await stripe.checkout.sessions.create({
				payment_method_types: ['card'],
				line_items: stripeLineItems,
				mode: 'payment',
				shipping_address_collection: {
					allowed_countries: [
						'US',
						'CA',
						'GB',
						'AU',
						'DE',
						'FR',
						'ES',
						'IT',
						'NL',
						'BE',
						'AT',
						'CH',
						'SE',
						'NO',
						'DK',
						'FI',
						'IE',
						'PT',
						'PL',
						'CZ'
					]
				},
				shipping_options: [
					{
						shipping_rate_data: {
							type: 'fixed_amount',
							fixed_amount: { amount: 500, currency: 'usd' },
							display_name: 'Standard Shipping',
							delivery_estimate: {
								minimum: { unit: 'business_day', value: 5 },
								maximum: { unit: 'business_day', value: 10 }
							}
						}
					},
					{
						shipping_rate_data: {
							type: 'fixed_amount',
							fixed_amount: { amount: 1500, currency: 'usd' },
							display_name: 'Express Shipping',
							delivery_estimate: {
								minimum: { unit: 'business_day', value: 2 },
								maximum: { unit: 'business_day', value: 5 }
							}
						}
					}
				],
				success_url: `${url.origin}/merch/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
				cancel_url: `${url.origin}/merch?cancelled=true`,
				metadata: {
					orderId,
					type: 'store_order'
				}
			});
			console.log('[Checkout] Stripe session created:', session.id);
		} catch (stripeError) {
			console.error('[Checkout] Stripe session creation failed:', stripeError);
			error(500, 'Failed to create Stripe checkout session');
		}

		console.log('[Checkout] Updating order with session ID...');
		try {
			await db.update(orders).set({ stripeSessionId: session.id }).where(eq(orders.id, orderId));
			console.log('[Checkout] Order updated successfully');
		} catch (dbUpdateError) {
			console.error('[Checkout] Database update failed:', dbUpdateError);
			// Non-fatal, session was already created
		}

		return json({ url: session.url });
	} catch (err) {
		console.error('[Checkout] Unexpected error:', err);
		throw err;
	}
};
