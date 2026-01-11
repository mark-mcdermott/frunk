<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { Car, Plus, Pencil, Trash2 } from 'lucide-svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { page } from '$app/stores';

	const vehicles = $derived($page.data.vehicles);
	const basePath = $derived($page.data.basePath || '');

	let deleteModalOpen = $state(false);
	let vehicleToDelete = $state<{ id: string; make: string; model: string } | null>(null);
</script>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900 flex flex-col">
	<Navbar />

	<main class="flex-1 px-4 sm:px-6 lg:px-8 py-12">
		<div class="max-w-4xl mx-auto">
			<Breadcrumbs items={[{ label: 'Vehicles' }]} />
			<div class="mb-8 flex items-end justify-between">
				<div>
					<h1 class="text-2xl font-bold text-black dark:text-white">My Vehicles</h1>
					<p class="text-sm text-surface-500 dark:text-gray-300 mt-1">Manage your vehicles and their documents.</p>
				</div>
				<a
					href="{basePath}/vehicles/new"
					class="btn inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg transition-colors"
				>
					<Plus class="w-4 h-4" />
					Add Vehicle
				</a>
			</div>

			{#if vehicles.length === 0}
				<div class="bg-white dark:bg-surface-800 rounded-2xl shadow-xl shadow-surface-900/5 border border-[#eee] p-12 text-center">
					<Car class="w-16 h-16 mx-auto text-surface-300 dark:text-gray-400 mb-4" />
					<h2 class="text-lg font-semibold text-black dark:text-white mb-2">No vehicles yet</h2>
					<p class="text-surface-500 dark:text-gray-300 mb-6">Add your first vehicle to get started tracking documents and maintenance.</p>
					<a
						href="{basePath}/vehicles/new"
						class="btn inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg transition-colors"
					>
						<Plus class="w-4 h-4" />
						Add Your First Vehicle
					</a>
				</div>
			{:else}
				<div class="grid gap-4">
					{#each vehicles as vehicle}
						<div
							class="group bg-white dark:bg-surface-800 rounded-2xl shadow-xl shadow-surface-900/5 border border-[#eee] p-6 hover:border-primary-200 dark:hover:border-primary-800 transition-colors cursor-pointer"
							onclick={(e) => { if (e.target.closest('a, button, form')) return; goto(`${basePath}/vehicles/${vehicle.id}`); }}
							role="button"
							tabindex="0"
							onkeydown={(e) => { if (e.key === 'Enter' && !e.target.closest('a, button, form')) goto(`${basePath}/vehicles/${vehicle.id}`); }}
						>
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-4">
									{#if vehicle.image}
										<img
											src={vehicle.image}
											alt="{vehicle.year} {vehicle.make} {vehicle.model}"
											class="w-16 h-12 object-cover rounded-lg"
										/>
									{:else}
										<div class="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center">
											<Car class="w-6 h-6 text-primary-500" />
										</div>
									{/if}
									<div>
										<h3 class="text-lg font-semibold text-black dark:text-white group-hover:text-primary-500 transition-colors">
											{vehicle.year} {vehicle.make} {vehicle.model}
										</h3>
										{#if vehicle.vin}
											<p class="text-sm text-surface-500 dark:text-gray-300">VIN: {vehicle.vin}</p>
										{/if}
									</div>
								</div>
								<div class="flex items-center gap-3">
									<a
										href="{basePath}/vehicles/{vehicle.id}/edit"
										class="p-2 text-primary-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
										aria-label="Edit vehicle"
									>
										<Pencil class="w-4 h-4" />
									</a>
									<form
										method="POST"
										action="?/delete"
										use:enhance
										class="hidden"
										id="delete-form-{vehicle.id}"
									>
										<input type="hidden" name="vehicleId" value={vehicle.id} />
									</form>
									<button
										type="button"
										class="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
										aria-label="Delete vehicle"
										onclick={() => {
											vehicleToDelete = { id: vehicle.id, make: vehicle.make, model: vehicle.model };
											deleteModalOpen = true;
										}}
									>
										<Trash2 class="w-4 h-4" />
									</button>
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

<ConfirmModal
	open={deleteModalOpen}
	title="Delete Vehicle"
	message={vehicleToDelete ? `Are you sure you want to delete your ${vehicleToDelete.make} ${vehicleToDelete.model}? This action cannot be undone.` : ''}
	confirmText="Delete"
	onConfirm={() => {
		if (vehicleToDelete) {
			const form = document.getElementById(`delete-form-${vehicleToDelete.id}`) as HTMLFormElement;
			form?.requestSubmit();
		}
		deleteModalOpen = false;
		vehicleToDelete = null;
	}}
	onCancel={() => {
		deleteModalOpen = false;
		vehicleToDelete = null;
	}}
/>
