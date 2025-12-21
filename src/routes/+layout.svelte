<script lang="ts">
	import './layout.css';
	import { Toaster } from 'svelte-sonner';
	import CookieConsent from '$lib/components/CookieConsent.svelte';
	import CartDrawer from '$lib/components/CartDrawer.svelte';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href="/favicon.ico" /></svelte:head>
<Toaster richColors position="top-right" closeButton />
{@render children()}
<CookieConsent />
<CartDrawer />
