<script lang="ts">
	import { enhance } from '$app/forms';
	import { ArrowLeft, X } from 'lucide-svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import { page } from '$app/stores';

	const note = $derived($page.data.note);
	const vehicle = $derived($page.data.vehicle);

	let title = $state($page.data.note.title);
	let body = $state($page.data.note.body || '');
	let currentImageUrl = $state($page.data.note.imageUrl);
	let selectedImage = $state<File | null>(null);
	let imageData = $state('');
	let removeImage = $state(false);
	let saving = $state(false);

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
			{ label: 'Vehicles', href: '/vehicles' },
			{ label: `${vehicle.year} ${vehicle.make} ${vehicle.model}`, href: `/vehicles/${vehicle.id}` },
			{ label: note.title, href: `/vehicles/${vehicle.id}/notes/${note.uuid}` },
			{ label: 'Edit' }
		]} />
	</div>

	<main class="flex-1 px-4 sm:px-6 lg:px-8 py-12">
		<div class="max-w-xl mx-auto">
			<!-- Back link -->
			<a
				href="/vehicles/{vehicle.id}/notes/{note.uuid}"
				class="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 mb-6"
			>
				<ArrowLeft class="w-4 h-4" />
				Back to note
			</a>

			<!-- Edit Form Card -->
			<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5 border border-[#eee]">
				<h1 class="text-xl font-bold text-black dark:text-white mb-6">Edit Note</h1>

				<form
					method="POST"
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
						<label for="note-title" class="text-xs font-medium text-surface-600 dark:text-surface-400 block mb-1">
							Title <span class="text-red-500">*</span>
						</label>
						<input
							type="text"
							id="note-title"
							name="title"
							bind:value={title}
							placeholder="e.g., Oil Change Receipt"
							class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
							required
						/>
					</div>

					<div>
						<label for="note-body" class="text-xs font-medium text-surface-600 dark:text-surface-400 block mb-1">
							Note (optional)
						</label>
						<textarea
							id="note-body"
							name="body"
							bind:value={body}
							rows="4"
							placeholder="Add details..."
							class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500 resize-none"
						></textarea>
					</div>

					<div>
						<label class="text-xs font-medium text-surface-600 dark:text-surface-400 block mb-1">
							Image (optional)
						</label>

						<!-- Show current image if exists and not marked for removal -->
						{#if currentImageUrl && !removeImage && !imageData}
							<div class="mb-3 relative inline-block">
								<img src={currentImageUrl} alt="Current" class="h-32 rounded-lg object-cover" />
								<button
									type="button"
									class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
									onclick={markImageForRemoval}
								>
									<X class="w-4 h-4" />
								</button>
							</div>
						{/if}

						<!-- Show new image preview -->
						{#if imageData}
							<div class="mb-3 relative inline-block">
								<img src={imageData} alt="New" class="h-32 rounded-lg object-cover" />
								<button
									type="button"
									class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
									onclick={clearNewImage}
								>
									<X class="w-4 h-4" />
								</button>
							</div>
						{/if}

						<input
							type="file"
							id="note-image"
							accept="image/*"
							onchange={handleImageSelect}
							class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-primary-500 file:text-white file:text-sm file:font-medium file:cursor-pointer"
						/>
					</div>

					<input type="hidden" name="fileData" value={imageData} />
					<input type="hidden" name="removeImage" value={removeImage.toString()} />

					<div class="flex gap-3 pt-4">
						<a
							href="/vehicles/{vehicle.id}/notes/{note.uuid}"
							class="flex-1 btn preset-outlined-surface-500 py-2.5 rounded-lg font-semibold text-center"
						>
							Cancel
						</a>
						<button
							type="submit"
							class="flex-1 btn preset-filled-primary-500 py-2.5 rounded-lg font-semibold text-white disabled:opacity-50"
							disabled={!title.trim() || saving}
						>
							{saving ? 'Saving...' : 'Save Changes'}
						</button>
					</div>
				</form>
			</div>
		</div>
	</main>

	<Footer />
</div>
