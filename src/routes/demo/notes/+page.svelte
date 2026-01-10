<script lang="ts">
	import { goto } from '$app/navigation';
	import { StickyNote, ImageIcon, ChevronRight } from 'lucide-svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import { page } from '$app/stores';

	const basePath = $derived($page.data.basePath || '');
	const notes = $derived($page.data.notes);
	const vehicles = $derived($page.data.vehicles);

	// Create a map of vehicle IDs to vehicle info for display
	const vehicleMap = $derived(
		vehicles.reduce(
			(acc: Record<string, { year: number; make: string; model: string; id: string }>, v: { id: string; year: number; make: string; model: string }) => {
				acc[v.id] = { year: v.year, make: v.make, model: v.model, id: v.id };
				return acc;
			},
			{}
		)
	);
</script>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900 flex flex-col">
	<Navbar />

	<main class="flex-1 px-4 sm:px-6 lg:px-8 py-12">
		<div class="max-w-4xl mx-auto">
			<Breadcrumbs items={[{ label: 'Notes' }]} />
			<div class="mb-8">
				<h1 class="text-2xl font-bold text-black dark:text-white">All Notes</h1>
				<p class="text-sm text-surface-500 mt-1">All notes across your vehicles.</p>
			</div>

			{#if notes.length === 0}
				<div class="bg-white dark:bg-surface-800 rounded-2xl shadow-xl shadow-surface-900/5 border border-[#eee] p-12 text-center">
					<StickyNote class="w-16 h-16 mx-auto text-surface-300 dark:text-surface-600 mb-4" />
					<h2 class="text-lg font-semibold text-black dark:text-white mb-2">No notes yet</h2>
					<p class="text-surface-500 mb-6">Add notes to your vehicles to see them here.</p>
					<a
						href="{basePath}/vehicles"
						class="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
					>
						Go to Vehicles
					</a>
				</div>
			{:else}
				<div class="grid gap-4">
					{#each notes as note}
						{@const vehicle = vehicleMap[note.vehicleId ?? '']}
						<div
							class="group bg-white dark:bg-surface-800 rounded-2xl shadow-xl shadow-surface-900/5 border border-[#eee] p-6 hover:border-primary-200 dark:hover:border-primary-800 transition-colors cursor-pointer"
							onclick={() => goto(`${basePath}/vehicles/${vehicle?.id}/notes/${note.uuid}`)}
							role="button"
							tabindex="0"
							onkeydown={(e) => { if (e.key === 'Enter') goto(`${basePath}/vehicles/${vehicle?.id}/notes/${note.uuid}`); }}
						>
							<div class="flex items-start gap-4">
								<div class="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
									<StickyNote class="w-6 h-6 text-primary-500" />
								</div>
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2">
										<h3 class="text-lg font-semibold text-black dark:text-white">{note.title}</h3>
										<ChevronRight class="w-4 h-4 text-surface-400 opacity-0 group-hover:opacity-100 transition-opacity" />
									</div>
									{#if note.body}
										<p class="text-sm text-surface-600 dark:text-surface-400 mt-1 line-clamp-2">{note.body}</p>
									{/if}
									<div class="flex items-center gap-3 mt-2 text-xs text-surface-500">
										{#if vehicle}
											<span>{vehicle.year} {vehicle.make} {vehicle.model}</span>
										{/if}
										{#if note.imageUrl}
											<span class="flex items-center gap-1">
												<ImageIcon class="w-3 h-3" />
												Has attachment
											</span>
										{/if}
										{#if note.parentNoteId}
											<span class="text-primary-500">Sub-note</span>
										{/if}
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</main>

	<Footer />
</div>
