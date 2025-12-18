<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900 flex flex-col">
	<Navbar />

	<!-- Breadcrumbs -->
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
		<Breadcrumbs items={[{ label: 'Email Verification' }]} />
	</div>

	<!-- Main Content -->
	<main class="flex-1 flex items-start justify-center pt-12 px-4 sm:px-6 lg:px-8">
		<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5 w-full max-w-sm border border-[#eee] text-center">
			{#if data.success}
				<div class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
					<svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
				</div>
				<h3 class="text-xl font-bold text-black dark:text-white mb-2">Email Verified!</h3>
				<p class="text-sm text-surface-500 mb-6">{data.message}</p>
				<a href="/sign-in" class="w-full btn preset-filled-primary-500 py-2.5 rounded-lg font-semibold text-white inline-block">
					Continue to Sign In
				</a>
			{:else}
				<div class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
					<svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</div>
				<h3 class="text-xl font-bold text-black dark:text-white mb-2">Verification Failed</h3>
				<p class="text-sm text-surface-500 mb-6">{data.message}</p>
				<a href="/sign-up" class="w-full btn preset-filled-primary-500 py-2.5 rounded-lg font-semibold text-white inline-block">
					Sign Up Again
				</a>
			{/if}
		</div>
	</main>

	<Footer />
</div>
