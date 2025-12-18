<script lang="ts">
	import { getAvailableSizes, getAvailableColors, getVariantByOptions, formatPrice } from '$lib/data/products';
	import { ShoppingBag, ArrowLeft, Check } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';

	let { data } = $props();
	const product = data.product;

	const sizes = getAvailableSizes(product);
	const colors = getAvailableColors(product);

	let selectedSize = $state(sizes[0] || '');
	let selectedColor = $state(colors[0]?.color || '');
	let isLoading = $state(false);

	const selectedVariant = $derived(getVariantByOptions(product, selectedSize, selectedColor));

	async function handleCheckout() {
		if (!selectedVariant) {
			toast.error('Please select a size and color');
			return;
		}

		isLoading = true;
		try {
			const response = await fetch('/api/store/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					productId: product.id,
					variantId: selectedVariant.id,
					quantity: 1
				})
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to create checkout');
			}

			// Redirect to Stripe checkout
			window.location.href = result.url;
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to create checkout');
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>{product.name} - Frunk Store</title>
	<meta name="description" content={product.description} />
</svelte:head>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900 py-8 px-4 sm:px-6 lg:px-8">
	<div class="max-w-6xl mx-auto">
		<Breadcrumbs items={[{ label: 'Store', href: '/store' }, { label: product.name }]} />

		<div class="grid md:grid-cols-2 gap-12">
			<!-- Product Image -->
			<div
				class="aspect-square bg-surface-100 dark:bg-surface-800 rounded-2xl flex items-center justify-center overflow-hidden"
			>
				{#if product.images[0]}
					<img
						src={product.images[0]}
						alt={product.name}
						class="w-full h-full object-cover"
						onerror={(e) => {
							const img = e.currentTarget as HTMLImageElement;
							img.style.display = 'none';
							const next = img.nextElementSibling as HTMLElement;
							if (next) next.style.display = 'flex';
						}}
					/>
					<div class="hidden w-full h-full items-center justify-center">
						<ShoppingBag class="w-24 h-24 text-surface-400" />
					</div>
				{:else}
					<ShoppingBag class="w-24 h-24 text-surface-400" />
				{/if}
			</div>

			<!-- Product Info -->
			<div>
				<h1 class="text-3xl sm:text-4xl font-bold text-surface-900 dark:text-white mb-4">
					{product.name}
				</h1>
				<p class="text-2xl font-bold text-surface-900 dark:text-white mb-6">
					{formatPrice(product.price)}
				</p>
				<p class="text-surface-600 dark:text-surface-400 mb-8">{product.description}</p>

				<!-- Color Selector -->
				{#if colors.length > 1}
					<div class="mb-6">
						<label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-3"
							>Color: {selectedColor}</label
						>
						<div class="flex gap-3">
							{#each colors as { color, hex }}
								<button
									type="button"
									onclick={() => (selectedColor = color)}
									class="w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer"
									style="background-color: {hex}; border-color: {selectedColor === color
										? 'var(--color-primary, #3b82f6)'
										: 'transparent'};"
									title={color}
								>
									{#if selectedColor === color}
										<Check
											class="w-5 h-5"
											style="color: {hex === '#ffffff' || hex === '#fff' ? '#000' : '#fff'}"
										/>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Size Selector -->
				<div class="mb-8">
					<label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-3"
						>Size</label
					>
					<div class="flex flex-wrap gap-3">
						{#each sizes as size}
							<button
								type="button"
								onclick={() => (selectedSize = size)}
								class="px-4 py-2 border rounded-lg transition-all cursor-pointer {selectedSize ===
								size
									? 'bg-primary-500 text-white border-primary-500'
									: 'border-surface-300 dark:border-surface-600 hover:border-surface-500 dark:hover:border-surface-400 text-surface-700 dark:text-surface-300'}"
							>
								{size}
							</button>
						{/each}
					</div>
				</div>

				<!-- Buy Button -->
				<button
					onclick={handleCheckout}
					disabled={!selectedVariant || isLoading}
					class="w-full py-4 text-lg font-semibold rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-primary-500 text-white hover:bg-primary-600 shadow-lg shadow-primary-500/25"
				>
					{#if isLoading}
						Processing...
					{:else}
						Buy Now - {formatPrice(product.price)}
					{/if}
				</button>

				<p class="text-sm text-surface-500 mt-4 text-center">
					Shipping calculated at checkout. Printed and shipped by Printful.
				</p>

				<!-- Product Details -->
				<div class="mt-8 p-6 bg-white dark:bg-surface-800 rounded-2xl">
					<h3 class="font-semibold text-surface-900 dark:text-white mb-3">Product Details</h3>
					<ul class="text-sm text-surface-600 dark:text-surface-400 space-y-2">
						<li>100% ring-spun cotton</li>
						<li>Pre-shrunk fabric</li>
						<li>Side-seamed construction</li>
						<li>Shoulder-to-shoulder taping</li>
						<li>Printed on demand - ships in 2-5 business days</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
</div>
