<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	const basePath = $derived($page.data.basePath || '');
	const vendor = $derived($page.data.vendor);

	let deleteModalOpen = $state(false);
	let deleteFormEl: HTMLFormElement | null = $state(null);
	let saving = $state(false);
</script>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900 flex flex-col">
	<Navbar />

	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
		<Breadcrumbs items={[
			{ label: 'Vendors', href: `${basePath}/vendors` },
			{ label: vendor.name, href: `${basePath}/vendors/${vendor.id}` },
			{ label: 'Edit' }
		]} />
	</div>

	<main class="flex-1 flex items-start justify-center pt-12 px-4 sm:px-6 lg:px-8">
		<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5 w-full max-w-sm border border-[#eee]">
			<h3 class="text-xl font-bold text-black dark:text-white mb-2">Edit Vendor</h3>
			<p class="text-sm text-surface-500 mb-6">Update vendor details.</p>

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
					<label for="name-input" class="text-xs font-medium text-surface-600 dark:text-surface-400 block mb-1">
						Name <span class="text-red-500">*</span>
					</label>
					<input
						id="name-input"
						name="name"
						type="text"
						value={vendor.name}
						placeholder="Joe's Auto Shop"
						class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
						required
					/>
				</div>
				<div>
					<label for="phone-input" class="text-xs font-medium text-surface-600 dark:text-surface-400 block mb-1">
						Phone <span class="text-surface-400">(optional)</span>
					</label>
					<input
						id="phone-input"
						name="phone"
						type="tel"
						value={vendor.phone ?? ''}
						placeholder="(555) 123-4567"
						class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
					/>
				</div>
				<div>
					<label for="address-input" class="text-xs font-medium text-surface-600 dark:text-surface-400 block mb-1">
						Address <span class="text-surface-400">(optional)</span>
					</label>
					<input
						id="address-input"
						name="address"
						type="text"
						value={vendor.address ?? ''}
						placeholder="123 Main St, City, State"
						class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
					/>
				</div>
				<div>
					<label for="website-input" class="text-xs font-medium text-surface-600 dark:text-surface-400 block mb-1">
						Website <span class="text-surface-400">(optional)</span>
					</label>
					<input
						id="website-input"
						name="website"
						type="url"
						value={vendor.website ?? ''}
						placeholder="https://example.com"
						class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
					/>
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
	title="Delete Vendor"
	message={`Are you sure you want to delete "${vendor.name}"? This action cannot be undone.`}
	confirmText="Delete"
	onConfirm={() => {
		deleteFormEl?.requestSubmit();
		deleteModalOpen = false;
	}}
	onCancel={() => {
		deleteModalOpen = false;
	}}
/>
