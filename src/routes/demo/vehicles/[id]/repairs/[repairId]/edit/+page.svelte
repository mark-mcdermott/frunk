<script lang="ts">
	import { enhance } from '$app/forms';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { page } from '$app/stores';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	const basePath = $derived($page.data.basePath || '');
	const repair = $derived($page.data.repair);
	const vehicle = $derived($page.data.vehicle);
	const vendors = $derived($page.data.vendors);

	let deleteModalOpen = $state(false);
	let deleteFormEl: HTMLFormElement | null = $state(null);
	let saving = $state(false);

	// Format date for input
	function formatDateForInput(date: Date | string): string {
		const d = new Date(date);
		return d.toISOString().split('T')[0];
	}

	// Format cost from cents to dollars
	function formatCostForInput(cents: number | null): string {
		if (cents === null) return '';
		return (cents / 100).toFixed(2);
	}
</script>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900 flex flex-col">
	<Navbar />

	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
		<Breadcrumbs items={[
			{ label: 'Vehicles', href: `${basePath}/vehicles` },
			{ label: `${vehicle.year} ${vehicle.make} ${vehicle.model}`, href: `${basePath}/vehicles/${vehicle.id}` },
			{ label: repair.description, href: `${basePath}/vehicles/${vehicle.id}/repairs/${repair.id}` },
			{ label: 'Edit' }
		]} />
	</div>

	<main class="flex-1 flex items-start justify-center pt-12 px-4 sm:px-6 lg:px-8">
		<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5 w-full max-w-sm border border-[#eee]">
			<h3 class="text-xl font-bold text-black dark:text-white mb-2">Edit Repair</h3>
			<p class="text-sm text-surface-500 mb-6">Update repair details.</p>

			<form
				method="post"
				action="?/update"
				use:enhance={() => {
					saving = true;
					return async ({ update }) => {
						await update();
						saving = false;
					};
				}}
				class="space-y-4"
			>
				<div>
					<label for="description-input" class="text-xs font-medium text-surface-600 dark:text-surface-400 block mb-1">
						Description <span class="text-red-500">*</span>
					</label>
					<input
						id="description-input"
						name="description"
						type="text"
						value={repair.description}
						placeholder="e.g., Oil change"
						class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
						required
					/>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="date-input" class="text-xs font-medium text-surface-600 dark:text-surface-400 block mb-1">
							Date <span class="text-red-500">*</span>
						</label>
						<input
							id="date-input"
							name="date"
							type="date"
							value={formatDateForInput(repair.date)}
							class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
							required
						/>
					</div>
					<div>
						<label for="mileage-input" class="text-xs font-medium text-surface-600 dark:text-surface-400 block mb-1">
							Mileage
						</label>
						<input
							id="mileage-input"
							name="mileage"
							type="number"
							value={repair.mileage ?? ''}
							placeholder="50000"
							class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
						/>
					</div>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="cost-input" class="text-xs font-medium text-surface-600 dark:text-surface-400 block mb-1">
							Cost
						</label>
						<input
							id="cost-input"
							name="cost"
							type="number"
							value={formatCostForInput(repair.cost)}
							placeholder="150.00"
							step="0.01"
							min="0"
							class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
						/>
					</div>
					<div>
						<label for="status-input" class="text-xs font-medium text-surface-600 dark:text-surface-400 block mb-1">
							Status
						</label>
						<select
							id="status-input"
							name="status"
							class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
						>
							<option value="completed" selected={repair.status === 'completed'}>Completed</option>
							<option value="scheduled" selected={repair.status === 'scheduled'}>Scheduled</option>
							<option value="in_progress" selected={repair.status === 'in_progress'}>In Progress</option>
						</select>
					</div>
				</div>
				<div>
					<label for="vendor-input" class="text-xs font-medium text-surface-600 dark:text-surface-400 block mb-1">
						Vendor
					</label>
					<select
						id="vendor-input"
						name="vendorId"
						class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
					>
						<option value="">No vendor</option>
						{#each vendors as vendor}
							<option value={vendor.id} selected={repair.vendorId === vendor.id}>{vendor.name}</option>
						{/each}
					</select>
				</div>
				<div class="flex gap-3">
					<button
						type="submit"
						class="flex-1 btn preset-filled-primary-500 py-2.5 rounded-lg font-semibold text-white disabled:opacity-50"
						disabled={saving}
					>
						{saving ? 'Saving...' : 'Save Changes'}
					</button>
					<button
						type="button"
						class="flex-1 btn py-2.5 rounded-lg font-semibold border border-red-500 bg-transparent text-black dark:text-white hover:bg-red-50 dark:hover:bg-red-500/10"
						onclick={() => deleteModalOpen = true}
					>
						Delete
					</button>
				</div>
			</form>
			<form method="POST" action="?/delete" bind:this={deleteFormEl} class="hidden"></form>
			{#if form?.message}
				<p class="text-red-500 text-sm mt-4">{form.message}</p>
			{/if}
		</div>
	</main>

	<Footer />
</div>

<ConfirmModal
	open={deleteModalOpen}
	title="Delete Repair"
	message={`Are you sure you want to delete "${repair.description}"? This action cannot be undone.`}
	confirmText="Delete"
	onConfirm={() => {
		deleteFormEl?.requestSubmit();
		deleteModalOpen = false;
	}}
	onCancel={() => {
		deleteModalOpen = false;
	}}
/>
