<script lang="ts">
	import { enhance } from '$app/forms';
	import { ArrowLeft, Pencil, Trash2, Wrench, Calendar, Hash, DollarSign, Store, StickyNote, Plus, ImageIcon, ChevronRight } from 'lucide-svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { page } from '$app/stores';

	const basePath = $derived($page.data.basePath || '');
	const repair = $derived($page.data.repair);
	const vehicle = $derived($page.data.vehicle);
	const notes = $derived($page.data.notes);

	let noteModalOpen = $state(false);
	let deleteModalOpen = $state(false);
	let noteToDelete = $state<{ uuid: string; title: string } | null>(null);

	// Note form state
	let noteTitle = $state('');
	let noteBody = $state('');
	let selectedImage = $state<File | null>(null);
	let imageData = $state('');
	let saving = $state(false);

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
			{ label: 'Vehicles', href: `${basePath}/vehicles` },
			{ label: `${vehicle.year} ${vehicle.make} ${vehicle.model}`, href: `${basePath}/vehicles/${vehicle.id}` },
			{ label: repair.description }
		]} />
	</div>

	<main class="flex-1 px-4 sm:px-6 lg:px-8 py-12">
		<div class="max-w-3xl mx-auto">
			<!-- Back link -->
			<a
				href="{basePath}/vehicles/{vehicle.id}"
				class="inline-flex items-center gap-2 text-sm text-surface-500 dark:text-gray-300 hover:text-surface-700 dark:hover:text-surface-300 mb-6"
			>
				<ArrowLeft class="w-4 h-4" />
				Back to vehicle
			</a>

			<!-- Repair Detail Card -->
			<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5 border border-[#eee] mb-6">
				<!-- Header -->
				<div class="flex items-start justify-between gap-4 mb-6">
					<div class="flex items-start gap-4">
						<div class="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
							<Wrench class="w-6 h-6 text-primary-500" />
						</div>
						<div>
							<h1 class="text-2xl font-bold text-black dark:text-white">{repair.description}</h1>
							<span class="inline-block mt-2 text-xs px-2 py-0.5 rounded-full {repair.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : repair.status === 'scheduled' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}">
								{repair.status}
							</span>
						</div>
					</div>
					<a
						href="{basePath}/vehicles/{vehicle.id}/repairs/{repair.id}/edit"
						class="p-2 text-primary-500 hover:text-[#93c5fd] hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
						title="Edit"
					>
						<Pencil class="w-4 h-4" />
					</a>
				</div>

				<!-- Details -->
				<div class="space-y-3">
					<div class="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-700/50 rounded-lg">
						<Calendar class="w-5 h-5 text-surface-400" />
						<div>
							<p class="text-xs text-surface-500 dark:text-gray-300">Date</p>
							<p class="text-sm font-medium text-black dark:text-white">{formatDate(repair.date)}</p>
						</div>
					</div>

					{#if repair.mileage}
						<div class="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-700/50 rounded-lg">
							<Hash class="w-5 h-5 text-surface-400" />
							<div>
								<p class="text-xs text-surface-500 dark:text-gray-300">Mileage</p>
								<p class="text-sm font-medium text-black dark:text-white">{repair.mileage.toLocaleString()} mi</p>
							</div>
						</div>
					{/if}

					{#if repair.cost}
						<div class="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-700/50 rounded-lg">
							<DollarSign class="w-5 h-5 text-surface-400" />
							<div>
								<p class="text-xs text-surface-500 dark:text-gray-300">Cost</p>
								<p class="text-sm font-medium text-green-600 dark:text-green-400">{formatCost(repair.cost)}</p>
							</div>
						</div>
					{/if}

					{#if repair.vendorName}
						<a
							href="{basePath}/vendors/{repair.vendorId}"
							class="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-700/50 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
						>
							<Store class="w-5 h-5 text-surface-400" />
							<div>
								<p class="text-xs text-surface-500 dark:text-gray-300">Vendor</p>
								<p class="text-sm font-medium text-primary-500 hover:underline">{repair.vendorName}</p>
							</div>
						</a>
					{/if}
				</div>
			</div>

			<!-- Notes Section -->
			<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5 border border-[#eee]">
				<div class="flex items-center justify-between mb-6">
					<h2 class="text-lg font-bold text-black dark:text-white flex items-center gap-2">
						<StickyNote class="w-5 h-5" />
						Notes
					</h2>
					<button
						type="button"
						class="btn inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg transition-colors"
						onclick={() => noteModalOpen = true}
					>
						<Plus class="w-4 h-4" />
						Add Note
					</button>
				</div>

				{#if notes.length === 0}
					<div class="text-center py-8">
						<StickyNote class="w-12 h-12 mx-auto text-surface-300 dark:text-gray-400 mb-3" />
						<p class="text-surface-500 dark:text-gray-300 text-sm">No notes yet</p>
						<p class="text-surface-400 text-xs mt-1">Add receipts, invoices, or other details</p>
					</div>
				{:else}
					<div class="space-y-3">
						{#each notes as note}
							<div class="group relative bg-surface-50 dark:bg-surface-700/50 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
								<a
									href="{basePath}/vehicles/{vehicle.id}/notes/{note.uuid}"
									class="block p-4"
								>
									<div class="flex items-start gap-3 pr-10">
										<div class="flex-1 min-w-0">
											<div class="flex items-center gap-2">
												<h3 class="font-medium text-black dark:text-white">{note.title}</h3>
												<ChevronRight class="w-4 h-4 text-surface-400 opacity-0 group-hover:opacity-100 transition-opacity" />
											</div>
											{#if note.body}
												<p class="text-sm text-surface-600 dark:text-gray-300 mt-1 line-clamp-2">{note.body}</p>
											{/if}
											{#if note.imageUrl}
												<div class="mt-3 flex items-center gap-2 text-xs text-surface-500 dark:text-gray-300">
													<ImageIcon class="w-4 h-4" />
													<span>Has attachment</span>
												</div>
											{/if}
										</div>
									</div>
								</a>
								<div class="absolute top-3 right-3">
									<button
										type="button"
										class="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
										aria-label="Delete note"
										onclick={(e) => { e.preventDefault(); noteToDelete = { uuid: note.uuid, title: note.title }; deleteModalOpen = true; }}
									>
										<Trash2 class="w-4 h-4" />
									</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</main>

	<Footer />
</div>

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
					<label for="note-title" class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">
						Title <span class="text-red-500">*</span>
					</label>
					<input
						type="text"
						id="note-title"
						name="title"
						bind:value={noteTitle}
						placeholder="e.g., Invoice, Receipt"
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
						bind:value={noteBody}
						rows="3"
						placeholder="Add details..."
						class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500 resize-none"
					></textarea>
				</div>

				<div>
					<label for="note-image" class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">
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

<!-- Delete Note Confirmation Modal -->
<ConfirmModal
	open={deleteModalOpen}
	title="Delete Note"
	message={noteToDelete ? `Are you sure you want to delete "${noteToDelete.title}"? This action cannot be undone.` : ''}
	confirmText="Delete"
	onConfirm={() => {
		if (noteToDelete) {
			const form = document.getElementById(`delete-note-form-${noteToDelete.uuid}`) as HTMLFormElement;
			form?.requestSubmit();
		}
		deleteModalOpen = false;
		noteToDelete = null;
	}}
	onCancel={() => {
		deleteModalOpen = false;
		noteToDelete = null;
	}}
/>

<!-- Hidden delete forms -->
{#each notes as note}
	<form method="POST" action="?/deleteNote" use:enhance class="hidden" id="delete-note-form-{note.uuid}">
		<input type="hidden" name="noteUuid" value={note.uuid} />
	</form>
{/each}
