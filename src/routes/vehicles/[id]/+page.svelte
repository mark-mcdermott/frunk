<script lang="ts">
	import { Car, Pencil, Calendar, Hash } from 'lucide-svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import { page } from '$app/stores';

	const vehicle = $derived($page.data.vehicle);
</script>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900 flex flex-col">
	<Navbar />

	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
		<Breadcrumbs items={[{ label: 'Vehicles', href: '/vehicles' }, { label: `${vehicle.year} ${vehicle.make} ${vehicle.model}` }]} />
	</div>

	<main class="flex-1 flex items-start justify-center pt-12 px-4 sm:px-6 lg:px-8">
		<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5 w-full max-w-md border border-[#eee]">
			<div class="flex flex-col items-center text-center">
				{#if vehicle.image}
					<img
						src={vehicle.image}
						alt="{vehicle.year} {vehicle.make} {vehicle.model}"
						class="w-full h-48 object-cover rounded-xl mb-4"
					/>
				{:else}
					<div class="w-20 h-20 bg-primary-500/10 rounded-2xl flex items-center justify-center mb-4">
						<Car class="w-10 h-10 text-primary-500" />
					</div>
				{/if}
				<h1 class="text-2xl font-bold text-black dark:text-white mb-1">
					{vehicle.year} {vehicle.make} {vehicle.model}
				</h1>
			</div>

			<div class="mt-8 space-y-4">
				<div class="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-700/50 rounded-lg">
					<Calendar class="w-5 h-5 text-surface-400" />
					<div>
						<p class="text-xs text-surface-500">Year</p>
						<p class="text-sm font-medium text-black dark:text-white">{vehicle.year}</p>
					</div>
				</div>

				<div class="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-700/50 rounded-lg">
					<Car class="w-5 h-5 text-surface-400" />
					<div>
						<p class="text-xs text-surface-500">Make & Model</p>
						<p class="text-sm font-medium text-black dark:text-white">{vehicle.make} {vehicle.model}</p>
					</div>
				</div>

				{#if vehicle.vin}
					<div class="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-700/50 rounded-lg">
						<Hash class="w-5 h-5 text-surface-400" />
						<div>
							<p class="text-xs text-surface-500">VIN</p>
							<p class="text-sm font-medium text-black dark:text-white font-mono">{vehicle.vin}</p>
						</div>
					</div>
				{/if}
			</div>

			<div class="mt-8 pt-6 border-t border-surface-200 dark:border-surface-700">
				<a
					href="/vehicles/{vehicle.id}/edit"
					class="w-full btn preset-filled-primary-500 py-2.5 rounded-lg font-semibold text-white flex items-center justify-center gap-2"
				>
					<Pencil class="w-4 h-4" />
					Edit Vehicle
				</a>
			</div>
		</div>
	</main>

	<Footer />
</div>
