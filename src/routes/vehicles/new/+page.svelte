<script lang="ts">
	import { enhance } from '$app/forms';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900 flex flex-col">
	<Navbar />

	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
		<Breadcrumbs items={[{ label: 'Vehicles', href: '/vehicles' }, { label: 'Add Vehicle' }]} />
	</div>

	<main class="flex-1 flex items-start justify-center pt-12 px-4 sm:px-6 lg:px-8">
		<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5 w-full max-w-sm border border-[#eee]">
			<h3 class="text-xl font-bold text-black dark:text-white mb-2">Add Vehicle</h3>
			<p class="text-sm text-surface-500 dark:text-gray-300 mb-6">Enter your vehicle's details.</p>

			<form method="post" use:enhance class="space-y-4">
				<div>
					<label for="year-input" class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">Year</label>
					<input
						id="year-input"
						name="year"
						type="number"
						min="1900"
						max={new Date().getFullYear() + 2}
						value={form?.year ?? new Date().getFullYear()}
						placeholder="2024"
						class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
						required
					/>
				</div>
				<div>
					<label for="make-input" class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">Make</label>
					<input
						id="make-input"
						name="make"
						type="text"
						value={form?.make ?? ''}
						placeholder="Toyota"
						class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
						required
					/>
				</div>
				<div>
					<label for="model-input" class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">Model</label>
					<input
						id="model-input"
						name="model"
						type="text"
						value={form?.model ?? ''}
						placeholder="Camry"
						class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
						required
					/>
				</div>
				<div>
					<label for="vin-input" class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">VIN <span class="text-surface-400">(optional)</span></label>
					<input
						id="vin-input"
						name="vin"
						type="text"
						value={form?.vin ?? ''}
						placeholder="1HGBH41JXMN109186"
						maxlength="17"
						class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500 font-mono"
					/>
				</div>
				<div class="flex gap-3">
					<button type="submit" class="flex-1 btn preset-filled-primary-500 py-2.5 rounded-lg font-semibold text-white">
						Add Vehicle
					</button>
					<a href="/vehicles" class="flex-1 btn preset-outlined-surface-500 py-2.5 rounded-lg font-semibold block text-center border border-surface-300 dark:border-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700">
						Cancel
					</a>
				</div>
			</form>
			{#if form?.message}
				<p class="text-red-500 text-sm mt-4">{form.message}</p>
			{/if}
		</div>
	</main>

	<Footer />
</div>
