import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { createStripe } from '$lib/server/stripe';
import { db } from '$lib/server/db';
import { orders } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ url }) => {
	const sessionId = url.searchParams.get('session_id');

	if (!sessionId) {
		redirect(302, '/store');
	}

	const stripeSecretKey = env.STRIPE_SECRET_KEY;

	if (!stripeSecretKey) {
		error(500, 'Configuration error');
	}

	const stripe = createStripe(stripeSecretKey);

	try {
		const session = await stripe.checkout.sessions.retrieve(sessionId, {
			expand: ['line_items']
		});

		if (session.payment_status !== 'paid') {
			redirect(302, '/store?error=payment_incomplete');
		}

		const orderId = session.metadata?.orderId;
		let order = null;

		if (orderId) {
			const [dbOrder] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
			order = dbOrder;
		}

		return {
			orderNumber: orderId || session.id.slice(-8).toUpperCase(),
			email: session.customer_details?.email || session.customer_email || '',
			total: session.amount_total ? session.amount_total / 100 : 0,
			shippingAddress: session.shipping_details?.address
				? {
						name: session.shipping_details.name,
						line1: session.shipping_details.address.line1,
						line2: session.shipping_details.address.line2,
						city: session.shipping_details.address.city,
						state: session.shipping_details.address.state,
						postalCode: session.shipping_details.address.postal_code,
						country: session.shipping_details.address.country
					}
				: null,
			items: (order?.items as Array<{
				name: string;
				color: string;
				size: string;
				quantity: number;
				price: number;
			}>) || []
		};
	} catch (err) {
		console.error('Error retrieving order:', err);
		redirect(302, '/store?error=order_not_found');
	}
};
