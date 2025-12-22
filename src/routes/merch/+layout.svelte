<script lang="ts">
	import { ShoppingCart } from 'lucide-svelte';
	import { cartItemCount, openCart } from '$lib/stores/cart';

	let { children } = $props();
</script>

<!-- Floating Cart Button -->
<button
	type="button"
	onclick={openCart}
	class="fixed top-20 right-4 z-30 flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface-800 rounded-full shadow-lg border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors cursor-pointer"
	aria-label="Open shopping cart"
>
	<ShoppingCart class="w-5 h-5 text-surface-600 dark:text-surface-400" />
	<span class="text-sm font-medium text-surface-600 dark:text-surface-400">Cart</span>
	{#if $cartItemCount > 0}
		<span class="w-5 h-5 bg-primary-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
			{$cartItemCount > 9 ? '9+' : $cartItemCount}
		</span>
	{/if}
</button>

{@render children()}
