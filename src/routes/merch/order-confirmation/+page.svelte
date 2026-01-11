<script lang="ts">
	import { CheckCircle, Package, Mail, MapPin, ArrowLeft } from 'lucide-svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Order Confirmed - Frunk Merch</title>
</svelte:head>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900 py-8 px-4 sm:px-6 lg:px-8">
	<div class="max-w-2xl mx-auto">
		<Breadcrumbs items={[{ label: 'Merch', href: '/merch' }, { label: 'Order Confirmation' }]} />
		<div class="text-center mb-8">
			<div
				class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-500/20 mb-4"
			>
				<CheckCircle class="w-8 h-8 text-success-500" />
			</div>
			<h1 class="text-3xl font-bold text-surface-600 dark:text-gray-300 mb-2">Order Confirmed!</h1>
			<p class="text-surface-600 dark:text-gray-300">
				Thank you for your purchase. Your order is being processed.
			</p>
		</div>

		<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl mb-6">
			<div class="flex items-center justify-between mb-4">
				<span class="text-sm text-surface-600 dark:text-gray-300">Order Number</span>
				<span class="font-mono font-semibold text-surface-600 dark:text-gray-300"
					>{data.orderNumber}</span
				>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-sm text-surface-600 dark:text-gray-300">Total</span>
				<span class="text-xl font-bold text-surface-600 dark:text-gray-300"
					>${data.total.toFixed(2)}</span
				>
			</div>
		</div>

		<div class="grid gap-6 md:grid-cols-2">
			<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl">
				<div class="flex items-center gap-2 mb-4">
					<Mail class="w-4 h-4 text-surface-600 dark:text-gray-300" />
					<h2 class="font-semibold text-surface-600 dark:text-gray-300">Confirmation Email</h2>
				</div>
				<p class="text-sm text-surface-600 dark:text-gray-300">A confirmation email has been sent to:</p>
				<p class="font-medium text-surface-600 dark:text-gray-300 mt-1">{data.email}</p>
			</div>

			{#if data.shippingAddress}
				<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl">
					<div class="flex items-center gap-2 mb-4">
						<MapPin class="w-4 h-4 text-surface-600 dark:text-gray-300" />
						<h2 class="font-semibold text-surface-600 dark:text-gray-300">Shipping Address</h2>
					</div>
					<div class="text-sm">
						<p class="font-medium text-surface-600 dark:text-gray-300">{data.shippingAddress.name}</p>
						<p class="text-surface-600 dark:text-gray-300">{data.shippingAddress.line1}</p>
						{#if data.shippingAddress.line2}
							<p class="text-surface-600 dark:text-gray-300">{data.shippingAddress.line2}</p>
						{/if}
						<p class="text-surface-600 dark:text-gray-300">
							{data.shippingAddress.city}, {data.shippingAddress.state}
							{data.shippingAddress.postalCode}
						</p>
						<p class="text-surface-600 dark:text-gray-300">{data.shippingAddress.country}</p>
					</div>
				</div>
			{/if}
		</div>

		{#if data.items && data.items.length > 0}
			<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl mt-6">
				<div class="flex items-center gap-2 mb-4">
					<Package class="w-4 h-4 text-surface-600 dark:text-gray-300" />
					<h2 class="font-semibold text-surface-600 dark:text-gray-300">Order Items</h2>
				</div>
				<ul class="divide-y divide-surface-200 dark:divide-surface-700">
					{#each data.items as item}
						<li class="py-3 flex justify-between">
							<div>
								<p class="font-medium text-surface-600 dark:text-gray-300">{item.name}</p>
								<p class="text-sm text-surface-600 dark:text-gray-300">
									{item.color} / {item.size} × {item.quantity}
								</p>
							</div>
							<p class="font-medium text-surface-600 dark:text-gray-300">
								${((item.price * item.quantity) / 100).toFixed(2)}
							</p>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<div class="mt-8 p-6 bg-surface-100 dark:bg-surface-800 rounded-2xl">
			<h3 class="font-semibold text-surface-600 dark:text-gray-300 mb-2">What's Next?</h3>
			<ul class="text-sm text-surface-600 dark:text-gray-300 space-y-2">
				<li>• Your order will be printed and shipped within 2-5 business days</li>
				<li>• You'll receive a tracking number via email once shipped</li>
				<li>• Estimated delivery: 5-10 business days after shipping</li>
			</ul>
		</div>

		<div class="text-center mt-8">
			<a
				href="/merch"
				class="inline-flex items-center gap-2 text-primary-500 hover:text-primary-600"
			>
				<ArrowLeft class="w-4 h-4" />
				Continue Shopping
			</a>
		</div>
	</div>
</div>
