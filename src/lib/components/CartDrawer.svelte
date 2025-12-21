<script lang="ts">
	import { X, Minus, Plus, ShoppingBag, Trash2, ShoppingCart } from 'lucide-svelte';
	import { cart, cartItemCount, cartSubtotal, isCartOpen, closeCart } from '$lib/stores/cart';
	import { formatPrice } from '$lib/data/products';
	import { toast } from 'svelte-sonner';
	import { fly, fade } from 'svelte/transition';

	let isLoading = $state(false);

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeCart();
		}
	}

	function handleBackdropClick() {
		closeCart();
	}

	function incrementQuantity(productId: string, variantId: string, currentQty: number) {
		cart.updateQuantity(productId, variantId, currentQty + 1);
	}

	function decrementQuantity(productId: string, variantId: string, currentQty: number) {
		cart.updateQuantity(productId, variantId, currentQty - 1);
	}

	function removeItem(productId: string, variantId: string, name: string) {
		cart.removeItem(productId, variantId);
		toast.success(`${name} removed from cart`);
	}

	async function handleCheckout() {
		const items = cart.getItems();
		if (items.length === 0) {
			toast.error('Your cart is empty');
			return;
		}

		isLoading = true;
		try {
			const response = await fetch('/api/store/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					items: items.map((item) => ({
						productId: item.productId,
						variantId: item.variantId,
						quantity: item.quantity
					}))
				})
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to create checkout');
			}

			cart.clear();
			closeCart();
			window.location.href = result.url;
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to create checkout');
			isLoading = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if $isCartOpen}
	<!-- Backdrop -->
	<button
		type="button"
		class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 cursor-default"
		onclick={handleBackdropClick}
		aria-label="Close cart"
		transition:fade={{ duration: 200 }}
	></button>

	<!-- Drawer -->
	<div
		class="fixed right-0 top-0 h-full w-full max-w-[420px] bg-white dark:bg-surface-900 shadow-2xl z-50 flex flex-col"
		role="dialog"
		aria-modal="true"
		aria-label="Shopping cart"
		transition:fly={{ x: 420, duration: 300, opacity: 1 }}
	>
		<!-- Header -->
		<div class="flex items-center justify-between px-6 py-5 border-b border-surface-100 dark:border-surface-800">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center">
					<ShoppingCart class="w-5 h-5 text-primary-500" />
				</div>
				<div>
					<h2 class="text-lg font-semibold text-surface-600 dark:text-surface-400">Your Cart</h2>
					<p class="text-sm text-surface-500">{$cartItemCount} {$cartItemCount === 1 ? 'item' : 'items'}</p>
				</div>
			</div>
			<button
				type="button"
				onclick={closeCart}
				class="w-10 h-10 rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors cursor-pointer flex items-center justify-center"
				aria-label="Close cart"
			>
				<X class="w-5 h-5 text-surface-500" />
			</button>
		</div>

		<!-- Cart Items -->
		<div class="flex-1 overflow-y-auto">
			{#if $cart.length === 0}
				<div class="flex flex-col items-center justify-center h-full text-center px-6">
					<div class="w-20 h-20 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
						<ShoppingBag class="w-10 h-10 text-surface-300 dark:text-surface-600" />
					</div>
					<h3 class="text-lg font-medium text-surface-900 dark:text-white mb-1">Your cart is empty</h3>
					<p class="text-surface-500 mb-6">Looks like you haven't added anything yet</p>
					<button
						type="button"
						onclick={closeCart}
						class="px-6 py-2.5 bg-primary-500 text-white font-medium rounded-full hover:bg-primary-600 transition-colors cursor-pointer"
					>
						Start Shopping
					</button>
				</div>
			{:else}
				<div class="px-6 py-4 space-y-4">
					{#each $cart as item (item.productId + '-' + item.variantId)}
						<div
							class="group relative bg-surface-50 dark:bg-surface-800/50 rounded-2xl p-4 transition-all hover:shadow-lg hover:shadow-surface-900/5 dark:hover:shadow-black/20"
						>
							<div class="flex gap-4">
								<!-- Product Image -->
								<div class="w-20 h-20 bg-white dark:bg-surface-700 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
									{#if item.image}
										<img
											src={item.image}
											alt={item.name}
											class="w-full h-full object-cover"
										/>
									{:else}
										<div class="w-full h-full flex items-center justify-center">
											<ShoppingBag class="w-8 h-8 text-surface-300" />
										</div>
									{/if}
								</div>

								<!-- Product Details -->
								<div class="flex-1 min-w-0 flex flex-col">
									<!-- Product Name -->
									<h3 class="font-semibold text-surface-600 dark:text-surface-400">
										Frunk {item.shortName || item.name}
									</h3>

									<!-- Color & Size -->
									<p class="text-sm text-surface-600 dark:text-surface-400 mt-0.5">
										{item.color} · {item.size}
									</p>

									<!-- Price -->
									<div class="flex items-baseline gap-2 mt-1">
										<span class="text-base font-bold text-surface-600 dark:text-surface-400">
											{formatPrice(item.price * item.quantity)}
										</span>
										{#if item.quantity > 1}
											<span class="text-xs text-surface-600 dark:text-surface-400">
												({formatPrice(item.price)} each)
											</span>
										{/if}
									</div>

									<!-- Quantity Controls -->
									<div class="flex items-center justify-between mt-3">
										<div class="inline-flex items-center bg-white dark:bg-surface-700 rounded-full shadow-sm border border-surface-200 dark:border-surface-600">
											<button
												type="button"
												onclick={() => decrementQuantity(item.productId, item.variantId, item.quantity)}
												class="w-8 h-8 flex items-center justify-center hover:bg-surface-100 dark:hover:bg-surface-600 rounded-l-full transition-colors cursor-pointer"
												aria-label="Decrease quantity"
											>
												<Minus class="w-3.5 h-3.5 text-surface-600 dark:text-surface-300" />
											</button>
											<span class="w-8 text-center text-sm font-semibold text-surface-600 dark:text-surface-400">
												{item.quantity}
											</span>
											<button
												type="button"
												onclick={() => incrementQuantity(item.productId, item.variantId, item.quantity)}
												class="w-8 h-8 flex items-center justify-center hover:bg-surface-100 dark:hover:bg-surface-600 rounded-r-full transition-colors cursor-pointer"
												aria-label="Increase quantity"
											>
												<Plus class="w-3.5 h-3.5 text-surface-600 dark:text-surface-300" />
											</button>
										</div>

										<button
											type="button"
											onclick={() => removeItem(item.productId, item.variantId, item.name)}
											class="w-8 h-8 flex items-center justify-center text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-all cursor-pointer"
											aria-label="Remove item"
										>
											<Trash2 class="w-4 h-4" />
										</button>
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Footer -->
		{#if $cart.length > 0}
			<div class="border-t border-surface-100 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-800/30 p-6 space-y-4">
				<!-- Order Summary -->
				<div class="space-y-2">
					<div class="flex justify-between text-sm">
						<span class="text-surface-600 dark:text-surface-400">Subtotal ({$cartItemCount} {$cartItemCount === 1 ? 'item' : 'items'})</span>
						<span class="font-medium text-surface-600 dark:text-surface-400">{formatPrice($cartSubtotal)}</span>
					</div>
					<div class="flex justify-between text-sm">
						<span class="text-surface-600 dark:text-surface-400">Shipping</span>
						<span class="text-surface-600 dark:text-surface-400">Calculated at checkout</span>
					</div>
					<div class="h-px bg-surface-200 dark:bg-surface-700 my-2"></div>
					<div class="flex justify-between">
						<span class="font-semibold text-surface-600 dark:text-surface-400">Total</span>
						<span class="text-xl font-bold text-surface-600 dark:text-surface-400">{formatPrice($cartSubtotal)}</span>
					</div>
				</div>

				<!-- Checkout Button -->
				<button
					type="button"
					onclick={handleCheckout}
					disabled={isLoading}
					class="w-full py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:-translate-y-0.5 active:translate-y-0"
				>
					{#if isLoading}
						<span class="flex items-center justify-center gap-2">
							<svg class="animate-spin w-5 h-5" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							Processing...
						</span>
					{:else}
						Checkout · <span class="ml-2">{formatPrice($cartSubtotal)}</span>
					{/if}
				</button>

				<!-- Continue Shopping -->
				<button
					type="button"
					onclick={closeCart}
					class="w-full py-3 text-primary-500 hover:text-[#93c5fd] font-medium transition-colors cursor-pointer text-sm"
				>
					Continue Shopping
				</button>
			</div>
		{/if}
	</div>
{/if}
