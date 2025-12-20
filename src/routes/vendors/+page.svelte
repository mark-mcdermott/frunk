<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { Store, Plus, Pencil, Trash2, Phone, Globe, MapPin } from 'lucide-svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { page } from '$app/stores';

	const vendors = $derived($page.data.vendors);

	let deleteModalOpen = $state(false);
	let vendorToDelete = $state<{ id: string; name: string } | null>(null);
</script>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900 flex flex-col">
	<Navbar />

	<main class="flex-1 px-4 sm:px-6 lg:px-8 py-12">
		<div class="max-w-4xl mx-auto">
			<Breadcrumbs items={[{ label: 'Vendors' }]} />
			<div class="mb-8 flex items-end justify-between">
				<div>
					<h1 class="text-2xl font-bold text-black dark:text-white">My Vendors</h1>
					<p class="text-sm text-surface-500 mt-1">Manage your repair shops and service providers.</p>
				</div>
				<a
					href="/vendors/new"
					class="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
				>
					<Plus class="w-4 h-4" />
					Add Vendor
				</a>
			</div>

			{#if vendors.length === 0}
				<div class="bg-white dark:bg-surface-800 rounded-2xl shadow-xl shadow-surface-900/5 border border-[#eee] p-12 text-center">
					<Store class="w-16 h-16 mx-auto text-surface-300 dark:text-surface-600 mb-4" />
					<h2 class="text-lg font-semibold text-black dark:text-white mb-2">No vendors yet</h2>
					<p class="text-surface-500 mb-6">Add your first vendor to track repair shops and service providers.</p>
					<a
						href="/vendors/new"
						class="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
					>
						<Plus class="w-4 h-4" />
						Add Your First Vendor
					</a>
				</div>
			{:else}
				<div class="grid gap-4">
					{#each vendors as vendor}
						<div
							class="bg-white dark:bg-surface-800 rounded-2xl shadow-xl shadow-surface-900/5 border border-[#eee] p-6 hover:border-primary-200 dark:hover:border-primary-800 transition-colors cursor-pointer"
							onclick={(e) => { if (e.target.closest('a, button, form')) return; goto(`/vendors/${vendor.id}`); }}
							role="button"
							tabindex="0"
							onkeydown={(e) => { if (e.key === 'Enter' && !e.target.closest('a, button, form')) goto(`/vendors/${vendor.id}`); }}
						>
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-4">
									<div class="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center">
										<Store class="w-6 h-6 text-primary-500" />
									</div>
									<div>
										<h3 class="text-lg font-semibold text-black dark:text-white">
											{vendor.name}
										</h3>
										<div class="flex items-center gap-4 text-sm text-surface-500 mt-1">
											{#if vendor.phone}
												<span class="flex items-center gap-1">
													<Phone class="w-3 h-3" />
													{vendor.phone}
												</span>
											{/if}
											{#if vendor.address}
												<span class="flex items-center gap-1">
													<MapPin class="w-3 h-3" />
													{vendor.address.length > 30 ? vendor.address.slice(0, 30) + '...' : vendor.address}
												</span>
											{/if}
											{#if vendor.website}
												<span class="flex items-center gap-1">
													<Globe class="w-3 h-3" />
													Website
												</span>
											{/if}
										</div>
									</div>
								</div>
								<div class="flex items-center gap-3">
									<a
										href="/vendors/{vendor.id}/edit"
										class="p-2 text-primary-500 hover:text-[#93c5fd] hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
										aria-label="Edit vendor"
									>
										<Pencil class="w-4 h-4" />
									</a>
									<form
										method="POST"
										action="?/delete"
										use:enhance
										class="hidden"
										id="delete-form-{vendor.id}"
									>
										<input type="hidden" name="vendorId" value={vendor.id} />
									</form>
									<button
										type="button"
										class="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
										aria-label="Delete vendor"
										onclick={() => {
											vendorToDelete = { id: vendor.id, name: vendor.name };
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
	title="Delete Vendor"
	message={vendorToDelete ? `Are you sure you want to delete "${vendorToDelete.name}"? This action cannot be undone.` : ''}
	confirmText="Delete"
	onConfirm={() => {
		if (vendorToDelete) {
			const form = document.getElementById(`delete-form-${vendorToDelete.id}`) as HTMLFormElement;
			form?.requestSubmit();
		}
		deleteModalOpen = false;
		vendorToDelete = null;
	}}
	onCancel={() => {
		deleteModalOpen = false;
		vendorToDelete = null;
	}}
/>
