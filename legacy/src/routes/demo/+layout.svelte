<script lang="ts">
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { page } from '$app/stores';

	let { children } = $props();

	// Show welcome modal when first entering demo (on the vehicles page after redirect)
	let welcomeOpen = $state($page.url.pathname === '/demo/vehicles');
</script>

{@render children()}

<ConfirmModal
	open={welcomeOpen}
	title="Welcome to the Demo"
	message="You are logged in as a demo user. Poke around, add a vehicle, delete a vendor, do whatever you want—everything will be reset when you exit the demo."
	confirmText="Got it"
	confirmClass="bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white"
	cancelText=""
	onConfirm={() => welcomeOpen = false}
	onCancel={() => welcomeOpen = false}
/>
