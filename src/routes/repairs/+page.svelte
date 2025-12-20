<script lang="ts">
	import { Wrench, Car, Store, Calendar, DollarSign, ChevronRight } from 'lucide-svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import { page } from '$app/stores';

	const repairs = $derived($page.data.repairs);

	function formatCost(cents: number | null): string {
		if (cents === null) return '';
		return `$${(cents / 100).toFixed(2)}`;
	}

	function formatDate(date: Date | string): string {
		return new Date(date).toLocaleDateString();
	}
</script>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900 flex flex-col">
	<Navbar />

	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
		<Breadcrumbs items={[{ label: 'Repairs' }]} />
	</div>

	<main class="flex-1 px-4 sm:px-6 lg:px-8 py-12">
		<div class="max-w-4xl mx-auto">
			<!-- Header -->
			<div class="flex items-center justify-between mb-8">
				<div>
					<h1 class="text-2xl font-bold text-black dark:text-white">All Repairs</h1>
					<p class="text-surface-500 text-sm mt-1">
						{repairs.length} repair{repairs.length === 1 ? '' : 's'} across all vehicles
					</p>
				</div>
			</div>

			{#if repairs.length === 0}
				<div class="bg-white dark:bg-surface-800 rounded-2xl p-12 shadow-xl shadow-surface-900/5 border border-[#eee] text-center">
					<Wrench class="w-16 h-16 mx-auto text-surface-300 dark:text-surface-600 mb-4" />
					<h2 class="text-xl font-semibold text-black dark:text-white mb-2">No repairs yet</h2>
					<p class="text-surface-500 mb-6">Add repairs to your vehicles to see them here.</p>
					<a
						href="/vehicles"
						class="inline-flex items-center gap-2 btn preset-filled-primary-500 py-2.5 px-6 rounded-lg font-semibold text-white"
					>
						<Car class="w-4 h-4" />
						Go to Vehicles
					</a>
				</div>
			{:else}
				<div class="space-y-4">
					{#each repairs as repair}
						<a
							href="/vehicles/{repair.vehicleId}/repairs/{repair.id}"
							class="group block bg-white dark:bg-surface-800 rounded-2xl p-5 shadow-xl shadow-surface-900/5 border border-[#eee] hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
						>
							<div class="flex items-start justify-between gap-4">
								<div class="flex items-start gap-4 flex-1 min-w-0">
									<div class="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
										<Wrench class="w-6 h-6 text-primary-500" />
									</div>
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2">
											<h3 class="font-semibold text-black dark:text-white truncate">{repair.description}</h3>
											<ChevronRight class="w-4 h-4 text-surface-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
										</div>
										{#if repair.vehicle}
											<p class="text-sm text-surface-500 mt-1">
												{repair.vehicle.year} {repair.vehicle.make} {repair.vehicle.model}
											</p>
										{/if}
										<div class="flex flex-wrap items-center gap-3 mt-2 text-xs text-surface-500">
											<span class="flex items-center gap-1">
												<Calendar class="w-3 h-3" />
												{formatDate(repair.date)}
											</span>
											{#if repair.mileage}
												<span>{repair.mileage.toLocaleString()} mi</span>
											{/if}
											{#if repair.cost}
												<span class="flex items-center gap-1 text-green-600 dark:text-green-400">
													<DollarSign class="w-3 h-3" />
													{formatCost(repair.cost)}
												</span>
											{/if}
											{#if repair.vendorName}
												<span class="flex items-center gap-1">
													<Store class="w-3 h-3" />
													{repair.vendorName}
												</span>
											{/if}
										</div>
									</div>
								</div>
								<span class="text-xs px-2 py-0.5 rounded-full flex-shrink-0 {repair.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : repair.status === 'scheduled' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}">
									{repair.status}
								</span>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</main>

	<Footer />
</div>
