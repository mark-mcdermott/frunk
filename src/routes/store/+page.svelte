<script lang="ts">
	import { products, formatPrice } from '$lib/data/products';
	import { ShoppingBag } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Store - Frunk</title>
	<meta name="description" content="Browse our merchandise" />
</svelte:head>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900 py-16 px-4 sm:px-6 lg:px-8">
	<div class="max-w-6xl mx-auto">
		<div class="text-center mb-12">
			<h1 class="text-4xl sm:text-5xl font-bold text-surface-900 dark:text-white mb-4">Store</h1>
			<p class="text-lg text-surface-600 dark:text-surface-400 max-w-2xl mx-auto">
				Browse our collection. All items are printed on-demand and shipped directly to you.
			</p>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
			{#each products as product}
				<a href="/store/{product.slug}" class="group no-underline">
					<div
						class="bg-white dark:bg-surface-800 rounded-2xl overflow-hidden shadow-xl shadow-surface-900/5 hover:shadow-2xl transition-shadow"
					>
						<div class="aspect-square bg-surface-100 dark:bg-surface-700 flex items-center justify-center">
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
									<ShoppingBag class="w-16 h-16 text-surface-400" />
								</div>
							{:else}
								<ShoppingBag class="w-16 h-16 text-surface-400" />
							{/if}
						</div>
						<div class="p-6">
							<h2
								class="text-xl font-semibold mb-2 text-surface-900 dark:text-white group-hover:text-primary-500 transition-colors"
							>
								{product.name}
							</h2>
							<p class="text-surface-500 text-sm mb-4 line-clamp-2">
								{product.description}
							</p>
							<div class="flex items-center justify-between">
								<span class="text-lg font-bold text-surface-900 dark:text-white"
									>{formatPrice(product.price)}</span
								>
								<span class="text-sm text-surface-500">
									{product.variants.filter((v) => v.inStock).length} options
								</span>
							</div>
						</div>
					</div>
				</a>
			{/each}
		</div>

		{#if products.length === 0}
			<div class="text-center py-16">
				<ShoppingBag class="w-16 h-16 text-surface-400 mx-auto mb-4" />
				<h2 class="text-xl font-semibold text-surface-900 dark:text-white mb-2">Coming Soon</h2>
				<p class="text-surface-500">Our store is being set up. Check back soon!</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
