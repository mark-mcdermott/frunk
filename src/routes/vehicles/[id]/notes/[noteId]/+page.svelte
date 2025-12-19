<script lang="ts">
	import { Download, ArrowLeft } from 'lucide-svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import { page } from '$app/stores';

	const note = $derived($page.data.note);
	const vehicle = $derived($page.data.vehicle);

	function getFilename(url: string): string {
		const parts = url.split('/');
		return parts[parts.length - 1];
	}
</script>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900 flex flex-col">
	<Navbar />

	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
		<Breadcrumbs items={[
			{ label: 'Vehicles', href: '/vehicles' },
			{ label: `${vehicle.year} ${vehicle.make} ${vehicle.model}`, href: `/vehicles/${vehicle.id}` },
			{ label: note.title }
		]} />
	</div>

	<main class="flex-1 px-4 sm:px-6 lg:px-8 py-12">
		<div class="max-w-3xl mx-auto">
			<!-- Back link -->
			<a
				href="/vehicles/{vehicle.id}"
				class="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 mb-6"
			>
				<ArrowLeft class="w-4 h-4" />
				Back to vehicle
			</a>

			<!-- Note Card -->
			<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5 border border-[#eee]">
				<!-- Header -->
				<div class="flex items-start justify-between gap-4 mb-6">
					<div>
						<h1 class="text-2xl font-bold text-black dark:text-white">{note.title}</h1>
						{#if note.body}
							<p class="text-surface-600 dark:text-surface-400 mt-2 whitespace-pre-wrap">{note.body}</p>
						{/if}
					</div>
					{#if note.imageUrl}
						<a
							href={note.imageUrl}
							download={getFilename(note.imageUrl)}
							class="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
						>
							<Download class="w-4 h-4" />
							Download
						</a>
					{/if}
				</div>

				<!-- Image -->
				{#if note.imageUrl}
					<div class="border-t border-surface-200 dark:border-surface-700 pt-6">
						<img
							src={note.imageUrl}
							alt={note.title}
							class="w-full rounded-xl object-contain max-h-[70vh]"
						/>
					</div>
				{/if}
			</div>
		</div>
	</main>

	<Footer />
</div>
