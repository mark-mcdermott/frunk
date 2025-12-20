<script lang="ts">
	import { enhance } from '$app/forms';
	import { Car, Pencil, Calendar, Hash, StickyNote, Plus, Trash2, ImageIcon, ChevronRight, Wrench, DollarSign, Store } from 'lucide-svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { page } from '$app/stores';

	const vehicle = $derived($page.data.vehicle);
	const notes = $derived($page.data.notes);
	const repairs = $derived($page.data.repairs);
	const vendors = $derived($page.data.vendors);

	let noteModalOpen = $state(false);
	let deleteModalOpen = $state(false);
	let noteToDelete = $state<{ uuid: string; title: string } | null>(null);

	// Repair modal state
	let repairModalOpen = $state(false);
	let repairDeleteModalOpen = $state(false);
	let repairToDelete = $state<{ id: string; description: string } | null>(null);

	// Repair form state
	let repairDescription = $state('');
	let repairDate = $state('');
	let repairMileage = $state('');
	let repairCost = $state('');
	let repairVendorId = $state('');
	let repairStatus = $state('completed');
	let savingRepair = $state(false);

	// Note form state
	let noteTitle = $state('');
	let noteBody = $state('');
	let selectedImage = $state<File | null>(null);
	let imageData = $state('');
	let saving = $state(false);

	function resetRepairForm() {
		repairDescription = '';
		repairDate = '';
		repairMileage = '';
		repairCost = '';
		repairVendorId = '';
		repairStatus = 'completed';
	}

	function formatCost(cents: number | null): string {
		if (cents === null) return '';
		return `$${(cents / 100).toFixed(2)}`;
	}

	function formatDate(date: Date | string): string {
		return new Date(date).toLocaleDateString();
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
		<Breadcrumbs items={[{ label: 'Vehicles', href: '/vehicles' }, { label: `${vehicle.year} ${vehicle.make} ${vehicle.model}` }]} />
	</div>

	<main class="flex-1 px-4 sm:px-6 lg:px-8 py-12">
		<div class="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
			<!-- Vehicle Info Card -->
			<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5 border border-[#eee]">
				<div class="flex flex-col items-center text-center">
					{#if vehicle.image}
						<img
							src={vehicle.image}
							alt="{vehicle.year} {vehicle.make} {vehicle.model}"
							class="w-full h-48 object-cover rounded-xl mb-4"
						/>
					{:else}
						<div class="w-20 h-20 bg-primary-500/10 rounded-2xl flex items-center justify-center mb-4">
							<Car class="w-10 h-10 text-primary-500" />
						</div>
					{/if}
					<h1 class="text-2xl font-bold text-black dark:text-white mb-1">
						{vehicle.year} {vehicle.make} {vehicle.model}
					</h1>
				</div>

				<div class="mt-6 space-y-3">
					<div class="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-700/50 rounded-lg">
						<Calendar class="w-5 h-5 text-surface-400" />
						<div>
							<p class="text-xs text-surface-500">Year</p>
							<p class="text-sm font-medium text-black dark:text-white">{vehicle.year}</p>
						</div>
					</div>

					<div class="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-700/50 rounded-lg">
						<Car class="w-5 h-5 text-surface-400" />
						<div>
							<p class="text-xs text-surface-500">Make & Model</p>
							<p class="text-sm font-medium text-black dark:text-white">{vehicle.make} {vehicle.model}</p>
						</div>
					</div>

					{#if vehicle.vin}
						<div class="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-700/50 rounded-lg">
							<Hash class="w-5 h-5 text-surface-400" />
							<div>
								<p class="text-xs text-surface-500">VIN</p>
								<p class="text-sm font-medium text-black dark:text-white font-mono">{vehicle.vin}</p>
							</div>
						</div>
					{/if}
				</div>

				<div class="mt-6 pt-6 border-t border-surface-200 dark:border-surface-700">
					<a
						href="/vehicles/{vehicle.id}/edit"
						class="w-full btn preset-filled-primary-500 py-2.5 rounded-lg font-semibold text-white flex items-center justify-center gap-2"
					>
						<Pencil class="w-4 h-4" />
						Edit Vehicle
					</a>
				</div>
			</div>

			<!-- Notes Card -->
			<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5 border border-[#eee]">
				<div class="flex items-center justify-between mb-6">
					<h2 class="text-lg font-bold text-black dark:text-white flex items-center gap-2">
						<StickyNote class="w-5 h-5" />
						Notes
					</h2>
					<button
						type="button"
						class="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
						onclick={() => noteModalOpen = true}
					>
						<Plus class="w-4 h-4" />
						Add Note
					</button>
				</div>

				{#if notes.length === 0}
					<div class="text-center py-8">
						<StickyNote class="w-12 h-12 mx-auto text-surface-300 dark:text-surface-600 mb-3" />
						<p class="text-surface-500 text-sm">No notes yet</p>
						<p class="text-surface-400 text-xs mt-1">Add notes about your vehicle</p>
					</div>
				{:else}
					<div class="space-y-3">
						{#each notes as note}
							<div class="group relative bg-surface-50 dark:bg-surface-700/50 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
								<a
									href="/vehicles/{vehicle.id}/notes/{note.uuid}"
									class="block p-4"
								>
									<div class="flex items-start gap-3 pr-10">
										<div class="flex-1 min-w-0">
											<div class="flex items-center gap-2">
												<h3 class="font-medium text-black dark:text-white">{note.title}</h3>
												<ChevronRight class="w-4 h-4 text-surface-400 opacity-0 group-hover:opacity-100 transition-opacity" />
											</div>
											{#if note.body}
												<p class="text-sm text-surface-600 dark:text-surface-400 mt-1 line-clamp-2">{note.body}</p>
											{/if}
											{#if note.imageUrl}
												<div class="mt-3 flex items-center gap-2 text-xs text-surface-500">
													<ImageIcon class="w-4 h-4" />
													<span>Has attachment</span>
												</div>
											{/if}
										</div>
									</div>
								</a>
								<div class="absolute bottom-3 right-3 flex items-center gap-1">
								<a
									href="/vehicles/{vehicle.id}/notes/{note.uuid}/edit"
									class="p-2 text-primary-500 hover:text-[#93c5fd] hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
									aria-label="Edit note"
									onclick={(e) => e.stopPropagation()}
								>
									<Pencil class="w-4 h-4" />
								</a>
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

			<!-- Repairs Card -->
			<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5 border border-[#eee]">
				<div class="flex items-center justify-between mb-6">
					<h2 class="text-lg font-bold text-black dark:text-white flex items-center gap-2">
						<Wrench class="w-5 h-5" />
						Repairs
					</h2>
					<button
						type="button"
						class="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
						onclick={() => repairModalOpen = true}
					>
						<Plus class="w-4 h-4" />
						Add Repair
					</button>
				</div>

				{#if repairs.length === 0}
					<div class="text-center py-8">
						<Wrench class="w-12 h-12 mx-auto text-surface-300 dark:text-surface-600 mb-3" />
						<p class="text-surface-500 text-sm">No repairs yet</p>
						<p class="text-surface-400 text-xs mt-1">Track your vehicle repairs</p>
					</div>
				{:else}
					<div class="space-y-3">
						{#each repairs as repair}
							<div class="group relative bg-surface-50 dark:bg-surface-700/50 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
								<a
									href="/vehicles/{vehicle.id}/repairs/{repair.id}"
									class="block p-4"
								>
									<div class="flex items-start justify-between gap-2">
										<div class="flex-1 min-w-0">
											<div class="flex items-center gap-2">
												<h3 class="font-medium text-black dark:text-white">{repair.description}</h3>
												<ChevronRight class="w-4 h-4 text-surface-400 opacity-0 group-hover:opacity-100 transition-opacity" />
											</div>
											<div class="flex flex-wrap items-center gap-2 text-xs text-surface-500 mt-1">
												<span>{formatDate(repair.date)}</span>
												{#if repair.mileage}
													<span class="text-surface-300">|</span>
													<span>{repair.mileage.toLocaleString()} mi</span>
												{/if}
												{#if repair.cost}
													<span class="text-surface-300">|</span>
													<span class="text-green-600 dark:text-green-400">{formatCost(repair.cost)}</span>
												{/if}
											</div>
											{#if repair.vendorName}
												<div class="flex items-center gap-1 text-xs text-surface-500 mt-1">
													<Store class="w-3 h-3" />
													<span>{repair.vendorName}</span>
												</div>
											{/if}
										</div>
										<span class="text-xs px-2 py-0.5 rounded-full {repair.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : repair.status === 'scheduled' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}">
											{repair.status}
										</span>
									</div>
								</a>
								<div class="absolute bottom-3 right-3 flex items-center gap-1">
									<a
										href="/vehicles/{vehicle.id}/repairs/{repair.id}/edit"
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
										onclick={(e) => { e.preventDefault(); repairToDelete = { id: repair.id, description: repair.description }; repairDeleteModalOpen = true; }}
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

<!-- Delete Confirmation Modal -->
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

<!-- Hidden delete forms for notes -->
{#each notes as note}
	<form method="POST" action="?/deleteNote" use:enhance class="hidden" id="delete-note-form-{note.uuid}">
		<input type="hidden" name="noteUuid" value={note.uuid} />
	</form>
{/each}

<!-- Create Repair Modal -->
{#if repairModalOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onclick={(e) => { if (e.target === e.currentTarget) repairModalOpen = false; }}>
		<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
			<h3 class="text-lg font-bold text-black dark:text-white mb-4">Add Repair</h3>

			<form
				method="POST"
				action="?/createRepair"
				use:enhance={() => {
					savingRepair = true;
					return async ({ update }) => {
						await update();
						savingRepair = false;
						repairModalOpen = false;
						resetRepairForm();
					};
				}}
				class="space-y-4"
			>
				<div>
					<label for="repair-description" class="text-xs font-medium text-surface-600 dark:text-surface-400 block mb-1">
						Description <span class="text-red-500">*</span>
					</label>
					<input
						type="text"
						id="repair-description"
						name="description"
						bind:value={repairDescription}
						placeholder="e.g., Oil change, Brake replacement"
						class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
						required
					/>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="repair-date" class="text-xs font-medium text-surface-600 dark:text-surface-400 block mb-1">
							Date <span class="text-red-500">*</span>
						</label>
						<input
							type="date"
							id="repair-date"
							name="date"
							bind:value={repairDate}
							class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
							required
						/>
					</div>
					<div>
						<label for="repair-mileage" class="text-xs font-medium text-surface-600 dark:text-surface-400 block mb-1">
							Mileage
						</label>
						<input
							type="number"
							id="repair-mileage"
							name="mileage"
							bind:value={repairMileage}
							placeholder="e.g., 50000"
							class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
						/>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="repair-cost" class="text-xs font-medium text-surface-600 dark:text-surface-400 block mb-1">
							Cost
						</label>
						<input
							type="number"
							id="repair-cost"
							name="cost"
							bind:value={repairCost}
							placeholder="e.g., 150.00"
							step="0.01"
							min="0"
							class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
						/>
					</div>
					<div>
						<label for="repair-status" class="text-xs font-medium text-surface-600 dark:text-surface-400 block mb-1">
							Status
						</label>
						<select
							id="repair-status"
							name="status"
							bind:value={repairStatus}
							class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
						>
							<option value="completed">Completed</option>
							<option value="scheduled">Scheduled</option>
							<option value="in_progress">In Progress</option>
						</select>
					</div>
				</div>

				<div>
					<label for="repair-vendor" class="text-xs font-medium text-surface-600 dark:text-surface-400 block mb-1">
						Vendor
					</label>
					<select
						id="repair-vendor"
						name="vendorId"
						bind:value={repairVendorId}
						class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
					>
						<option value="">No vendor</option>
						{#each vendors as vendor}
							<option value={vendor.id}>{vendor.name}</option>
						{/each}
					</select>
					{#if vendors.length === 0}
						<p class="text-xs text-surface-500 mt-1">
							<a href="/vendors/new" class="text-primary-500 hover:underline">Add a vendor</a> to track where repairs are done
						</p>
					{/if}
				</div>

				<div class="flex gap-3 pt-4">
					<button
						type="button"
						class="flex-1 btn preset-outlined-surface-500 py-2.5 rounded-lg font-semibold"
						onclick={() => { repairModalOpen = false; resetRepairForm(); }}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="flex-1 btn preset-filled-primary-500 py-2.5 rounded-lg font-semibold text-white disabled:opacity-50"
						disabled={!repairDescription.trim() || !repairDate || savingRepair}
					>
						{savingRepair ? 'Saving...' : 'Save Repair'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

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
