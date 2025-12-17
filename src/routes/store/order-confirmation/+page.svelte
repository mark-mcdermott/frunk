<script lang="ts">
	import { CheckCircle, Package, Mail, MapPin, ArrowLeft } from 'lucide-svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Order Confirmed - Frunk Store</title>
</svelte:head>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900 py-16 px-4 sm:px-6 lg:px-8">
	<div class="max-w-2xl mx-auto">
		<div class="text-center mb-8">
			<div
				class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-500/20 mb-4"
			>
				<CheckCircle class="w-8 h-8 text-success-500" />
			</div>
			<h1 class="text-3xl font-bold text-surface-900 dark:text-white mb-2">Order Confirmed!</h1>
			<p class="text-surface-600 dark:text-surface-400">
				Thank you for your purchase. Your order is being processed.
			</p>
		</div>

		<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl mb-6">
			<div class="flex items-center justify-between mb-4">
				<span class="text-sm text-surface-500">Order Number</span>
				<span class="font-mono font-semibold text-surface-900 dark:text-white"
					>{data.orderNumber}</span
				>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-sm text-surface-500">Total</span>
				<span class="text-xl font-bold text-surface-900 dark:text-white"
					>${data.total.toFixed(2)}</span
				>
			</div>
		</div>

		<div class="grid gap-6 md:grid-cols-2">
			<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl">
				<div class="flex items-center gap-2 mb-4">
					<Mail class="w-4 h-4 text-surface-500" />
					<h2 class="font-semibold text-surface-900 dark:text-white">Confirmation Email</h2>
				</div>
				<p class="text-sm text-surface-500">A confirmation email has been sent to:</p>
				<p class="font-medium text-surface-900 dark:text-white mt-1">{data.email}</p>
			</div>

			{#if data.shippingAddress}
				<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl">
					<div class="flex items-center gap-2 mb-4">
						<MapPin class="w-4 h-4 text-surface-500" />
						<h2 class="font-semibold text-surface-900 dark:text-white">Shipping Address</h2>
					</div>
					<div class="text-sm">
						<p class="font-medium text-surface-900 dark:text-white">{data.shippingAddress.name}</p>
						<p class="text-surface-500">{data.shippingAddress.line1}</p>
						{#if data.shippingAddress.line2}
							<p class="text-surface-500">{data.shippingAddress.line2}</p>
						{/if}
						<p class="text-surface-500">
							{data.shippingAddress.city}, {data.shippingAddress.state}
							{data.shippingAddress.postalCode}
						</p>
						<p class="text-surface-500">{data.shippingAddress.country}</p>
					</div>
				</div>
			{/if}
		</div>

		{#if data.items && data.items.length > 0}
			<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl mt-6">
				<div class="flex items-center gap-2 mb-4">
					<Package class="w-4 h-4 text-surface-500" />
					<h2 class="font-semibold text-surface-900 dark:text-white">Order Items</h2>
				</div>
				<ul class="divide-y divide-surface-200 dark:divide-surface-700">
					{#each data.items as item}
						<li class="py-3 flex justify-between">
							<div>
								<p class="font-medium text-surface-900 dark:text-white">{item.name}</p>
								<p class="text-sm text-surface-500">
									{item.color} / {item.size} × {item.quantity}
								</p>
							</div>
							<p class="font-medium text-surface-900 dark:text-white">
								${((item.price * item.quantity) / 100).toFixed(2)}
							</p>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<div class="mt-8 p-6 bg-surface-100 dark:bg-surface-800 rounded-2xl">
			<h3 class="font-semibold text-surface-900 dark:text-white mb-2">What's Next?</h3>
			<ul class="text-sm text-surface-600 dark:text-surface-400 space-y-2">
				<li>• Your order will be printed and shipped within 2-5 business days</li>
				<li>• You'll receive a tracking number via email once shipped</li>
				<li>• Estimated delivery: 5-10 business days after shipping</li>
			</ul>
		</div>

		<div class="text-center mt-8">
			<a
				href="/store"
				class="inline-flex items-center gap-2 text-primary-500 hover:text-primary-600"
			>
				<ArrowLeft class="w-4 h-4" />
				Continue Shopping
			</a>
		</div>
	</div>
</div>
