<script lang="ts">
	import { enhance } from '$app/forms';
	import { Download, ArrowLeft, Pencil, Trash2, Plus, StickyNote, ImageIcon, ChevronRight } from 'lucide-svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { page } from '$app/stores';

	const basePath = $derived($page.data.basePath || '');
	const note = $derived($page.data.note);
	const vehicle = $derived($page.data.vehicle);
	const childNotes = $derived($page.data.childNotes);

	let downloading = $state(false);
	let deleteModalOpen = $state(false);
	let noteModalOpen = $state(false);

	// Note form state
	let noteTitle = $state('');
	let noteBody = $state('');
	let selectedImage = $state<File | null>(null);
	let imageData = $state('');
	let saving = $state(false);

	// Child note delete state
	let childDeleteModalOpen = $state(false);
	let childNoteToDelete = $state<{ uuid: string; title: string } | null>(null);
	let childDeleting = $state(false);

	function getFilename(url: string): string {
		const parts = url.split('/');
		return parts[parts.length - 1];
	}

	async function downloadImage() {
		if (!note.imageUrl || downloading) return;
		downloading = true;
		try {
			const response = await fetch(note.imageUrl);
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = getFilename(note.imageUrl);
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (e) {
			console.error('Download failed:', e);
		} finally {
			downloading = false;
		}
	}

	function handleImageSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			selectedImage = file;
			const reader = new FileReader();
			reader.onload = () => {
				imageData = reader.result as string;
			};
			reader.readAsDataURL(file);
		}
	}

	function resetForm() {
		noteTitle = '';
		noteBody = '';
		selectedImage = null;
		imageData = '';
	}
</script>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900 flex flex-col">
	<Navbar />

	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
		<Breadcrumbs items={[
			{ label: 'Vehicles', href: `${basePath}/vehicles` },
			{ label: `${vehicle.year} ${vehicle.make} ${vehicle.model}`, href: `${basePath}/vehicles/${vehicle.id}` },
			{ label: note.title }
		]} />
	</div>

	<main class="flex-1 px-4 sm:px-6 lg:px-8 py-12">
		<div class="max-w-3xl mx-auto">
			<!-- Back link -->
			<a
				href="{basePath}/vehicles/{vehicle.id}"
				class="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 mb-6"
			>
				<ArrowLeft class="w-4 h-4" />
				Back to vehicle
			</a>

			<!-- Note Card -->
			<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5 border border-[#eee]">
				<!-- Header -->
				<div class="flex items-start justify-between gap-4 mb-6">
					<div>
						<h1 class="text-2xl font-bold text-black dark:text-white">{note.title}</h1>
						{#if note.body}
							<p class="text-surface-600 dark:text-surface-400 mt-2 whitespace-pre-wrap">{note.body}</p>
						{/if}
					</div>
					<div class="flex-shrink-0 flex items-center gap-1">
						<button
							type="button"
							class="p-2 text-primary-500 hover:text-[#93c5fd] hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
							title="Add Note"
							onclick={() => noteModalOpen = true}
						>
							<Plus class="w-4 h-4" />
						</button>
						<a
							href="{basePath}/vehicles/{vehicle.id}/notes/{note.uuid}/edit"
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

				<!-- Image -->
				{#if note.imageUrl}
					<div class="border-t border-surface-200 dark:border-surface-700 pt-6">
						<div class="relative inline-block">
							<img
								src={note.imageUrl}
								alt={note.title}
								class="w-full rounded-xl object-contain max-h-[70vh]"
							/>
							<button
								type="button"
								onclick={downloadImage}
								disabled={downloading}
								class="absolute top-3 right-3 p-2 bg-white/90 dark:bg-surface-800/90 text-primary-500 hover:text-[#93c5fd] hover:bg-white dark:hover:bg-surface-800 rounded-lg transition-colors disabled:opacity-50 shadow-lg"
								title="Download"
							>
								<Download class="w-4 h-4" />
							</button>
						</div>
					</div>
				{/if}

				<!-- Child Notes Section -->
				{#if childNotes.length > 0}
					<div class="border-t border-surface-200 dark:border-surface-700 pt-6 mt-6">
						<h2 class="text-lg font-bold text-black dark:text-white flex items-center gap-2 mb-4">
							<StickyNote class="w-5 h-5" />
							Notes
						</h2>
						<div class="space-y-3">
							{#each childNotes as childNote}
								<div class="group relative bg-surface-50 dark:bg-surface-700/50 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
									<div class="flex items-start p-4">
										<a
											href="{basePath}/vehicles/{vehicle.id}/notes/{childNote.uuid}"
											class="flex-1 min-w-0"
										>
											<div class="flex items-center gap-2">
												<h3 class="font-medium text-black dark:text-white">{childNote.title}</h3>
												<ChevronRight class="w-4 h-4 text-surface-400 opacity-0 group-hover:opacity-100 transition-opacity" />
											</div>
											{#if childNote.body}
												<p class="text-sm text-surface-600 dark:text-surface-400 mt-1 line-clamp-2">{childNote.body}</p>
											{/if}
											{#if childNote.imageUrl}
												<div class="mt-3 flex items-center gap-2 text-xs text-surface-500">
													<ImageIcon class="w-4 h-4" />
													<span>Has attachment</span>
												</div>
											{/if}
										</a>
										<div class="flex items-center gap-1 ml-3">
											<a
												href="{basePath}/vehicles/{vehicle.id}/notes/{childNote.uuid}/edit"
												class="p-2 text-primary-500 hover:text-[#93c5fd] hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
												title="Edit"
											>
												<Pencil class="w-4 h-4" />
											</a>
											<button
												type="button"
												class="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
												title="Delete"
												onclick={() => { childNoteToDelete = { uuid: childNote.uuid, title: childNote.title }; childDeleteModalOpen = true; }}
											>
												<Trash2 class="w-4 h-4" />
											</button>
										</div>
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
					saving = true;
					return async ({ update }) => {
						await update();
						saving = false;
						noteModalOpen = false;
						resetForm();
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
						bind:value={noteTitle}
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
						bind:value={noteBody}
						rows="3"
						placeholder="Add details..."
						class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500 resize-none"
					></textarea>
				</div>

				<div>
					<label for="note-image" class="text-xs font-medium text-surface-600 dark:text-surface-400 block mb-1">
						Image (optional)
					</label>
					<input
						type="file"
						id="note-image"
						accept="image/*"
						onchange={handleImageSelect}
						class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-primary-500 file:text-white file:text-sm file:font-medium file:cursor-pointer"
					/>
					{#if imageData}
						<div class="mt-2 relative inline-block">
							<img src={imageData} alt="Preview" class="h-20 rounded-lg object-cover" />
							<button
								type="button"
								class="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
								onclick={() => { selectedImage = null; imageData = ''; }}
							>
								&times;
							</button>
						</div>
					{/if}
				</div>

				<input type="hidden" name="fileData" value={imageData} />

				<div class="flex gap-3 pt-4">
					<button
						type="button"
						class="flex-1 btn preset-outlined-surface-500 py-2.5 rounded-lg font-semibold"
						onclick={() => { noteModalOpen = false; resetForm(); }}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="flex-1 btn preset-filled-primary-500 py-2.5 rounded-lg font-semibold text-white disabled:opacity-50"
						disabled={!noteTitle.trim() || saving}
					>
						{saving ? 'Saving...' : 'Save Note'}
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
