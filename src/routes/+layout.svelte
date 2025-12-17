<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import { Toaster } from 'svelte-sonner';

	let { children } = $props();

	onMount(() => {
		import('theme-forseen');
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<Toaster richColors position="top-right" />
{@render children()}
