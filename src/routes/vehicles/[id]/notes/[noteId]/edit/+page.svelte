<script lang="ts">
	import { enhance } from '$app/forms';
	import { ArrowLeft, X, Plus, Trash2, Pencil, StickyNote, ImageIcon, ChevronRight } from 'lucide-svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { page } from '$app/stores';

	const note = $derived($page.data.note);
	const vehicle = $derived($page.data.vehicle);
	const childNotes = $derived($page.data.childNotes);

	let title = $state($page.data.note.title);
	let body = $state($page.data.note.body || '');
	let currentImageUrl = $state($page.data.note.imageUrl);
	let selectedImage = $state<File | null>(null);
	let imageData = $state('');
	let removeImage = $state(false);
	let saving = $state(false);
	let fileInput: HTMLInputElement;
	let deleteModalOpen = $state(false);
	let noteModalOpen = $state(false);

	// Note form state
	let noteTitle = $state('');
	let noteBody = $state('');
	let noteImageData = $state('');
	let noteSaving = $state(false);

	// Child note delete state
	let childDeleteModalOpen = $state(false);
	let childNoteToDelete = $state<{ uuid: string; title: string } | null>(null);
	let childDeleting = $state(false);

	const hasImage = $derived((currentImageUrl && !removeImage) || imageData);

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

	function handleNoteImageSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = () => {
				noteImageData = reader.result as string;
			};
			reader.readAsDataURL(file);
		}
	}

	function resetNoteForm() {
		noteTitle = '';
		noteBody = '';
		noteImageData = '';
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
				class="inline-flex items-center gap-2 text-sm text-surface-500 dark:text-gray-300 hover:text-surface-700 dark:hover:text-surface-300 mb-6"
			>
				<ArrowLeft class="w-4 h-4" />
				Back to note
			</a>

			<!-- Edit Form Card -->
			<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5 border border-[#eee]">
				<div class="flex items-center justify-between mb-6">
					<h1 class="text-xl font-bold text-black dark:text-white">Edit Note</h1>
					<div class="flex items-center gap-1">
						<button
							type="button"
							class="p-2 text-primary-500 hover:text-[#93c5fd] hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
							title="Add Note"
							onclick={() => noteModalOpen = true}
						>
							<Plus class="w-4 h-4" />
						</button>
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

				<form
					method="POST"
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
						<label for="note-title" class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">
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
						<label for="note-body" class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">
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
						<label class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">
							Image (optional)
						</label>

						<input
							type="file"
							id="note-image"
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

					<!-- Child Notes Section -->
					{#if childNotes.length > 0}
						<div class="border-t border-surface-200 dark:border-surface-700 pt-4 mt-4">
							<h2 class="text-sm font-bold text-black dark:text-white flex items-center gap-2 mb-3">
								<StickyNote class="w-4 h-4" />
								Notes
							</h2>
							<div class="space-y-2">
								{#each childNotes as childNote}
									<div class="group relative bg-surface-50 dark:bg-surface-700/50 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
										<div class="flex items-start p-3">
											<a
												href="/vehicles/{vehicle.id}/notes/{childNote.uuid}"
												class="flex-1 min-w-0"
											>
												<div class="flex items-center gap-2">
													<h3 class="font-medium text-sm text-black dark:text-white">{childNote.title}</h3>
													<ChevronRight class="w-3 h-3 text-surface-400 opacity-0 group-hover:opacity-100 transition-opacity" />
												</div>
												{#if childNote.body}
													<p class="text-xs text-surface-600 dark:text-gray-300 mt-1 line-clamp-1">{childNote.body}</p>
												{/if}
												{#if childNote.imageUrl}
													<div class="mt-1 flex items-center gap-1 text-xs text-surface-500 dark:text-gray-300">
														<ImageIcon class="w-3 h-3" />
														<span>Has attachment</span>
													</div>
												{/if}
											</a>
											<div class="flex items-center gap-1 ml-2">
												<a
													href="/vehicles/{vehicle.id}/notes/{childNote.uuid}/edit"
													class="p-1.5 text-primary-500 hover:text-[#93c5fd] hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
													title="Edit"
												>
													<Pencil class="w-3.5 h-3.5" />
												</a>
												<button
													type="button"
													class="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
													title="Delete"
													onclick={() => { childNoteToDelete = { uuid: childNote.uuid, title: childNote.title }; childDeleteModalOpen = true; }}
												>
													<Trash2 class="w-3.5 h-3.5" />
												</button>
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

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

<!-- Delete Confirmation Modal -->
<ConfirmModal
	open={deleteModalOpen}
	title="Delete Note"
	message={`Are you sure you want to delete "${note.title}"? This action cannot be undone.`}
	confirmText="Delete"
	onConfirm={() => {
		const form = document.getElementById('delete-note-form') as HTMLFormElement;
		form?.requestSubmit();
		deleteModalOpen = false;
	}}
	onCancel={() => deleteModalOpen = false}
/>

<!-- Hidden delete form -->
<form method="POST" action="?/delete" use:enhance class="hidden" id="delete-note-form"></form>

<!-- Create Note Modal -->
{#if noteModalOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onclick={(e) => { if (e.target === e.currentTarget) noteModalOpen = false; }}>
		<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
			<h3 class="text-lg font-bold text-black dark:text-white mb-4">Add Note</h3>

			<form
				method="POST"
				action="?/createNote"
				use:enhance={() => {
					noteSaving = true;
					return async ({ update }) => {
						await update();
						noteSaving = false;
						noteModalOpen = false;
						resetNoteForm();
					};
				}}
				class="space-y-4"
			>
				<div>
					<label for="child-note-title" class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">
						Title <span class="text-red-500">*</span>
					</label>
					<input
						type="text"
						id="child-note-title"
						name="title"
						bind:value={noteTitle}
						placeholder="e.g., Oil Change Receipt"
						class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
						required
					/>
				</div>

				<div>
					<label for="child-note-body" class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">
						Note (optional)
					</label>
					<textarea
						id="child-note-body"
						name="body"
						bind:value={noteBody}
						rows="3"
						placeholder="Add details..."
						class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500 resize-none"
					></textarea>
				</div>

				<div>
					<label for="child-note-image" class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">
						Image (optional)
					</label>
					<input
						type="file"
						id="child-note-image"
						accept="image/*"
						onchange={handleNoteImageSelect}
						class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-primary-500 file:text-white file:text-sm file:font-medium file:cursor-pointer"
					/>
					{#if noteImageData}
						<div class="mt-2 relative inline-block">
							<img src={noteImageData} alt="Preview" class="h-20 rounded-lg object-cover" />
							<button
								type="button"
								class="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
								onclick={() => noteImageData = ''}
							>
								&times;
							</button>
						</div>
					{/if}
				</div>

				<input type="hidden" name="fileData" value={noteImageData} />

				<div class="flex gap-3 pt-4">
					<button
						type="button"
						class="flex-1 btn preset-outlined-surface-500 py-2.5 rounded-lg font-semibold"
						onclick={() => { noteModalOpen = false; resetNoteForm(); }}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="flex-1 btn preset-filled-primary-500 py-2.5 rounded-lg font-semibold text-white disabled:opacity-50"
						disabled={!noteTitle.trim() || noteSaving}
					>
						{noteSaving ? 'Saving...' : 'Save Note'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Child Note Delete Confirmation Modal -->
<ConfirmModal
	open={childDeleteModalOpen}
	title="Delete Note"
	message={`Are you sure you want to delete "${childNoteToDelete?.title}"? This will also delete all of its sub-notes. This action cannot be undone.`}
	confirmText="Delete"
	onConfirm={() => {
		if (childNoteToDelete) {
			childDeleting = true;
			const form = document.getElementById('delete-child-note-form') as HTMLFormElement;
			const input = form?.querySelector('input[name="noteUuid"]') as HTMLInputElement;
			if (input) input.value = childNoteToDelete.uuid;
			form?.requestSubmit();
		}
		childDeleteModalOpen = false;
	}}
	onCancel={() => { childDeleteModalOpen = false; childNoteToDelete = null; }}
/>

<!-- Hidden child note delete form -->
<form method="POST" action="?/deleteChildNote" use:enhance={() => {
	return async ({ update }) => {
		await update();
		childDeleting = false;
		childNoteToDelete = null;
	};
}} class="hidden" id="delete-child-note-form">
	<input type="hidden" name="noteUuid" value="" />
</form>
