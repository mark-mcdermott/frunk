<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { Toaster } from 'svelte-sonner';

	let { children } = $props();

	onMount(() => {
		import('theme-forseen');
	});
</script>

<svelte:head><link rel="icon" href="/favicon.ico" /></svelte:head>
<Toaster richColors position="top-right" />
{@render children()}
