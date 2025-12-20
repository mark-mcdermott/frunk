<script lang="ts">
	import { enhance } from '$app/forms';
	import { ArrowLeft, Pencil, Trash2, Phone, Globe, MapPin, Wrench, ChevronRight } from 'lucide-svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { page } from '$app/stores';

	const vendor = $derived($page.data.vendor);
	const repairs = $derived($page.data.repairs);

	let deleteModalOpen = $state(false);
	let repairDeleteModalOpen = $state(false);
	let repairToDelete = $state<{ id: string; vehicleId: string; description: string } | null>(null);

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
		<Breadcrumbs items={[
			{ label: 'Vendors', href: '/vendors' },
			{ label: vendor.name }
		]} />
	</div>

	<main class="flex-1 px-4 sm:px-6 lg:px-8 py-12">
		<div class="max-w-3xl mx-auto">
			<!-- Back link -->
			<a
				href="/vendors"
				class="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 mb-6"
			>
				<ArrowLeft class="w-4 h-4" />
				Back to vendors
			</a>

			<!-- Vendor Card -->
			<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5 border border-[#eee]">
				<!-- Header -->
				<div class="flex items-start justify-between gap-4 mb-6">
					<div>
						<h1 class="text-2xl font-bold text-black dark:text-white">{vendor.name}</h1>
					</div>
					<div class="flex-shrink-0 flex items-center gap-1">
						<a
							href="/vendors/{vendor.id}/edit"
							class="p-2 text-primary-500 hover:text-[#93c5fd] hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
							title="Edit"
						>
							<Pencil class="w-4 h-4" />
						</a>
						<button
							type="button"
							class="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
							title="Delete"
							onclick={() => deleteModalOpen = true}
						>
							<Trash2 class="w-4 h-4" />
						</button>
					</div>
				</div>

				<!-- Contact Info -->
				<div class="space-y-3 text-surface-600 dark:text-surface-400">
					{#if vendor.phone}
						<div class="flex items-center gap-3">
							<Phone class="w-5 h-5 text-surface-400" />
							<a href="tel:{vendor.phone}" class="hover:text-primary-500">{vendor.phone}</a>
						</div>
					{/if}
					{#if vendor.address}
						<div class="flex items-center gap-3">
							<MapPin class="w-5 h-5 text-surface-400" />
							<span>{vendor.address}</span>
						</div>
					{/if}
					{#if vendor.website}
						<div class="flex items-center gap-3">
							<Globe class="w-5 h-5 text-surface-400" />
							<a href={vendor.website} target="_blank" rel="noopener noreferrer" class="hover:text-primary-500">
								{vendor.website}
							</a>
						</div>
					{/if}
				</div>

				<!-- Repairs Section -->
				{#if repairs.length > 0}
					<div class="border-t border-surface-200 dark:border-surface-700 pt-6 mt-6">
						<h2 class="text-lg font-bold text-black dark:text-white flex items-center gap-2 mb-4">
							<Wrench class="w-5 h-5" />
							Repairs at this vendor
						</h2>
						<div class="space-y-3">
							{#each repairs as repair}
								<div class="group relative bg-surface-50 dark:bg-surface-700/50 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
									<a
										href="/vehicles/{repair.vehicleId}/repairs/{repair.id}"
										class="block p-4"
									>
										<div class="flex items-start justify-between">
											<div>
												<div class="flex items-center gap-2">
													<h3 class="font-medium text-black dark:text-white">{repair.description}</h3>
													<ChevronRight class="w-4 h-4 text-surface-400 opacity-0 group-hover:opacity-100 transition-opacity" />
												</div>
												<div class="flex items-center gap-4 text-sm text-surface-500 mt-1">
													<span>{formatDate(repair.date)}</span>
													{#if repair.mileage}
														<span>{repair.mileage.toLocaleString()} mi</span>
													{/if}
													{#if repair.cost}
														<span class="text-green-600 dark:text-green-400">{formatCost(repair.cost)}</span>
													{/if}
												</div>
											</div>
											<span class="text-xs px-2 py-1 rounded-full {repair.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : repair.status === 'scheduled' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}">
												{repair.status}
											</span>
										</div>
									</a>
									<div class="absolute bottom-3 right-3 flex items-center gap-1">
										<a
											href="/vehicles/{repair.vehicleId}/repairs/{repair.id}/edit"
											class="p-2 text-primary-500 hover:text-[#93c5fd] hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
											aria-label="Edit repair"
											onclick={(e) => e.stopPropagation()}
										>
											<Pencil class="w-4 h-4" />
										</a>
										<button
											type="button"
											class="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
											aria-label="Delete repair"
											onclick={(e) => { e.preventDefault(); repairToDelete = { id: repair.id, vehicleId: repair.vehicleId, description: repair.description }; repairDeleteModalOpen = true; }}
										>
											<Trash2 class="w-4 h-4" />
										</button>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</main>

	<Footer />
</div>

<!-- Delete Confirmation Modal -->
<ConfirmModal
	open={deleteModalOpen}
	title="Delete Vendor"
	message={`Are you sure you want to delete "${vendor.name}"? This action cannot be undone.`}
	confirmText="Delete"
	onConfirm={() => {
		const form = document.getElementById('delete-vendor-form') as HTMLFormElement;
		form?.requestSubmit();
		deleteModalOpen = false;
	}}
	onCancel={() => deleteModalOpen = false}
/>

<!-- Hidden delete form -->
<form method="POST" action="?/delete" use:enhance class="hidden" id="delete-vendor-form"></form>

<!-- Delete Repair Confirmation Modal -->
<ConfirmModal
	open={repairDeleteModalOpen}
	title="Delete Repair"
	message={repairToDelete ? `Are you sure you want to delete "${repairToDelete.description}"? This action cannot be undone.` : ''}
	confirmText="Delete"
	onConfirm={() => {
		if (repairToDelete) {
			const form = document.getElementById(`delete-repair-form-${repairToDelete.id}`) as HTMLFormElement;
			form?.requestSubmit();
		}
		repairDeleteModalOpen = false;
		repairToDelete = null;
	}}
	onCancel={() => {
		repairDeleteModalOpen = false;
		repairToDelete = null;
	}}
/>

<!-- Hidden delete forms for repairs -->
{#each repairs as repair}
	<form method="POST" action="?/deleteRepair" use:enhance class="hidden" id="delete-repair-form-{repair.id}">
		<input type="hidden" name="repairId" value={repair.id} />
	</form>
{/each}
