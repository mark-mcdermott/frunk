<script lang="ts">
	import { enhance } from '$app/forms';
	import { X } from 'lucide-svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { page } from '$app/stores';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	const vehicle = $derived($page.data.vehicle);
	const basePath = $derived($page.data.basePath || '');

	let deleteModalOpen = $state(false);
	let deleteFormEl: HTMLFormElement | null = $state(null);
	let saving = $state(false);

	// Image handling state
	let currentImageUrl = $state($page.data.vehicle.image);
	let selectedImage = $state<File | null>(null);
	let imageData = $state('');
	let removeImage = $state(false);
	let fileInput: HTMLInputElement;

	function handleImageSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			selectedImage = file;
			removeImage = false;
			const reader = new FileReader();
			reader.onload = () => {
				imageData = reader.result as string;
			};
			reader.readAsDataURL(file);
		}
	}

	function clearNewImage() {
		selectedImage = null;
		imageData = '';
	}

	function markImageForRemoval() {
		removeImage = true;
		currentImageUrl = null;
	}
</script>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900 flex flex-col">
	<Navbar />

	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
		<Breadcrumbs items={[
			{ label: 'Vehicles', href: `${basePath}/vehicles` },
			{ label: `${vehicle.year} ${vehicle.make} ${vehicle.model}`, href: `${basePath}/vehicles/${vehicle.id}` },
			{ label: 'Edit' }
		]} />
	</div>

	<main class="flex-1 flex items-start justify-center pt-12 px-4 sm:px-6 lg:px-8">
		<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5 w-full max-w-sm border border-[#eee]">
			<h3 class="text-xl font-bold text-black dark:text-white mb-2">Edit Vehicle</h3>
			<p class="text-sm text-surface-500 dark:text-gray-300 mb-6">Update your vehicle's details.</p>

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
					<label for="year-input" class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">Year</label>
					<input
						id="year-input"
						name="year"
						type="number"
						min="1900"
						max={new Date().getFullYear() + 2}
						value={vehicle.year}
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
						value={vehicle.make}
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
						value={vehicle.model}
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
						value={vehicle.vin ?? ''}
						placeholder="1HGBH41JXMN109186"
						maxlength="17"
						class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500 font-mono"
					/>
				</div>

				<div>
					<label class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">
						Image <span class="text-surface-400">(optional)</span>
					</label>

					<input
						type="file"
						id="vehicle-image"
						accept="image/*"
						onchange={handleImageSelect}
						bind:this={fileInput}
						class="hidden"
					/>

					<!-- Show current image if exists and not marked for removal -->
					{#if currentImageUrl && !removeImage && !imageData}
						<div class="flex flex-col items-start gap-2">
							<div class="relative inline-block group">
								<img src={currentImageUrl} alt="Current" class="h-32 rounded-lg object-cover" />
								<button
									type="button"
									class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
									onclick={markImageForRemoval}
								>
									<X class="w-4 h-4" />
								</button>
							</div>
							<button
								type="button"
								onclick={() => fileInput.click()}
								class="btn px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium cursor-pointer transition-colors"
							>
								Change Image
							</button>
						</div>
					<!-- Show new image preview -->
					{:else if imageData}
						<div class="flex flex-col items-start gap-2">
							<div class="relative inline-block group">
								<img src={imageData} alt="New" class="h-32 rounded-lg object-cover" />
								<button
									type="button"
									class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
									onclick={clearNewImage}
								>
									<X class="w-4 h-4" />
								</button>
							</div>
							<button
								type="button"
								onclick={() => fileInput.click()}
								class="btn px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium cursor-pointer transition-colors"
							>
								Change Image
							</button>
						</div>
					{:else}
						<button
							type="button"
							onclick={() => fileInput.click()}
							class="btn px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium cursor-pointer transition-colors"
						>
							Add Image
						</button>
					{/if}
				</div>

				<input type="hidden" name="fileData" value={imageData} />
				<input type="hidden" name="removeImage" value={removeImage.toString()} />

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
	title="Delete Vehicle"
	message={`Are you sure you want to delete your ${vehicle.year} ${vehicle.make} ${vehicle.model}? This action cannot be undone.`}
	confirmText="Delete"
	onConfirm={() => {
		deleteFormEl?.requestSubmit();
		deleteModalOpen = false;
	}}
	onCancel={() => {
		deleteModalOpen = false;
	}}
/>
