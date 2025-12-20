<script lang="ts">
	import './layout.css';
	import { Toaster } from 'svelte-sonner';
	import CookieConsent from '$lib/components/CookieConsent.svelte';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href="/favicon.ico" /></svelte:head>
<Toaster richColors position="top-right" />
{@render children()}
<CookieConsent />
