<script lang="ts">
	import { getAvailableSizes, getAvailableColors, getVariantByOptions, formatPrice } from '$lib/data/products';
	import { ShoppingBag, Check } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import { cart, openCart } from '$lib/stores/cart';

	let { data } = $props();
	const product = data.product;

	const sizes = getAvailableSizes(product);
	const colors = getAvailableColors(product);

	let selectedSize = $state(sizes.includes('M') ? 'M' : sizes[0] || '');
	let selectedColor = $state(colors[0]?.color || '');
	let showBack = $state(false);

	// Zoom state
	let isZooming = $state(false);
	let zoomX = $state(50);
	let zoomY = $state(50);

	function handleMouseMove(e: MouseEvent) {
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		zoomX = ((e.clientX - rect.left) / rect.width) * 100;
		zoomY = ((e.clientY - rect.top) / rect.height) * 100;
	}

	const selectedVariant = $derived(getVariantByOptions(product, selectedSize, selectedColor));

	// Get the current price (variant price if available, otherwise product price)
	const currentPrice = $derived(selectedVariant?.price ?? product.price);

	// Get the current image based on selected color and front/back toggle
	const currentImage = $derived(() => {
		if (showBack && product.colorBackImages && product.colorBackImages[selectedColor]) {
			return product.colorBackImages[selectedColor];
		}
		if (product.colorImages && product.colorImages[selectedColor]) {
			return product.colorImages[selectedColor];
		}
		return product.images[0];
	});

	function handleAddToCart() {
		if (!selectedVariant) {
			toast.error('Please select a size and color');
			return;
		}

		// Get the front image for this color
		const image = product.colorImages?.[selectedColor] || product.images[0] || '';

		cart.addItem({
			productId: product.id,
			variantId: selectedVariant.id,
			name: product.name,
			shortName: product.shortName,
			size: selectedVariant.size,
			color: selectedVariant.color,
			price: currentPrice,
			image
		});

		toast.success(`${product.name} added to cart`);
		openCart();
	}
</script>

<svelte:head>
	<title>{product.name} - Frunk Merch</title>
	<meta name="description" content={product.description} />
</svelte:head>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900 py-8 px-4 sm:px-6 lg:px-8">
	<div class="max-w-6xl mx-auto">
		<Breadcrumbs items={[{ label: 'Merch', href: '/merch' }, { label: product.name }]} />

		<div class="grid md:grid-cols-2 gap-12">
			<!-- Product Image -->
			<div class="space-y-4">
				<div
					class="aspect-square bg-surface-100 dark:bg-surface-800 rounded-2xl flex items-center justify-center overflow-hidden relative cursor-zoom-in"
					onmouseenter={() => (isZooming = true)}
					onmouseleave={() => (isZooming = false)}
					onmousemove={handleMouseMove}
					role="img"
					aria-label="{product.name} - {showBack ? 'Back' : 'Front'}"
				>
					{#if currentImage()}
						<img
							src={currentImage()}
							alt="{product.name} - {showBack ? 'Back' : 'Front'}"
							class="w-full h-full object-cover transition-opacity duration-200"
							class:opacity-0={isZooming}
							onerror={(e) => {
								const img = e.currentTarget as HTMLImageElement;
								img.style.display = 'none';
								const next = img.nextElementSibling as HTMLElement;
								if (next) next.style.display = 'flex';
							}}
						/>
						<!-- Zoomed view -->
						{#if isZooming}
							<div
								class="absolute inset-0 bg-no-repeat"
								style="background-image: url({currentImage()}); background-size: 200%; background-position: {zoomX}% {zoomY}%;"
							></div>
						{/if}
						<div class="hidden w-full h-full items-center justify-center">
							<ShoppingBag class="w-24 h-24 text-surface-400" />
						</div>
					{:else}
						<ShoppingBag class="w-24 h-24 text-surface-400" />
					{/if}
				</div>
				<!-- Front/Back Toggle -->
				{#if product.colorBackImages}
					<div class="flex justify-center gap-2">
						<button
							type="button"
							onclick={() => (showBack = false)}
							class="px-4 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer {!showBack
								? 'bg-primary-500 text-white'
								: 'bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-300 dark:hover:bg-surface-600'}"
						>
							Front
						</button>
						<button
							type="button"
							onclick={() => (showBack = true)}
							class="px-4 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer {showBack
								? 'bg-primary-500 text-white'
								: 'bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-300 dark:hover:bg-surface-600'}"
						>
							Back
						</button>
					</div>
				{/if}
			</div>

			<!-- Product Info -->
			<div>
				<h1 class="text-3xl sm:text-4xl font-bold text-surface-600 dark:text-surface-400 mb-4">
					{product.name}
				</h1>
				<p class="text-2xl font-bold text-surface-600 dark:text-surface-400 mb-6">
					{formatPrice(currentPrice)}
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

				<!-- Add to Cart Button -->
				<button
					onclick={handleAddToCart}
					disabled={!selectedVariant}
					class="w-full py-4 text-lg font-semibold rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-primary-500 text-white hover:bg-primary-600 shadow-lg shadow-primary-500/25"
				>
					Add to Cart · <span class="ml-2">{formatPrice(currentPrice)}</span>
				</button>

				<p class="text-sm text-surface-500 mt-4 text-center">
					Shipping calculated at checkout.
				</p>

				<!-- Product Details -->
				<div class="mt-8 p-6 bg-white dark:bg-surface-800 rounded-2xl">
					<h3 class="font-semibold text-surface-600 dark:text-surface-400 mb-3">Product Details</h3>
					<ul class="text-sm text-surface-600 dark:text-surface-400 space-y-2">
						{#if product.category === 'tshirt'}
							<li>100% ring-spun cotton</li>
							<li>Pre-shrunk fabric</li>
							<li>Side-seamed construction</li>
							<li>Shoulder-to-shoulder taping</li>
						{:else if product.category === 'hoodie'}
							<li>80% ring-spun cotton, 20% polyester</li>
							<li>Soft fleece interior</li>
							<li>Double-lined hood</li>
							<li>Front pouch pocket</li>
						{:else if product.category === 'sticker'}
							<li>High-quality kiss-cut vinyl</li>
							<li>Durable and waterproof</li>
							<li>Easy peel-and-stick application</li>
							<li>White border around design</li>
						{:else}
							<li>Premium quality materials</li>
						{/if}
						<li>Usually ships in 2-5 business days</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
</div>
