<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
</script>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900 flex flex-col">
	<Navbar />

	<!-- Main Content - Centered Card -->
	<main class="flex-1 flex items-start justify-center pt-48 px-4 sm:px-6 lg:px-8">
		<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5 w-full max-w-sm text-center border border-[#eee]">
			<span class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary-500/10 text-secondary-600 dark:text-secondary-400 text-sm font-medium mb-6">
				404
			</span>
			<p class="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
				<span class="text-transparent bg-clip-text bg-gradient-to-r from-secondary-500 to-primary-500">
					Apologies, this page could not be found.
				</span>
			</p>
		</div>
	</main>

	<Footer />
</div>
