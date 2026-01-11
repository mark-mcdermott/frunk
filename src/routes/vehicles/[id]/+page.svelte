<script lang="ts">
	import { enhance } from '$app/forms';
	import { Car, Pencil, Calendar, Hash, StickyNote, Plus, Trash2, ImageIcon, ChevronRight, Wrench, DollarSign, Store, Camera, X, GripVertical } from 'lucide-svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { page } from '$app/stores';
	import { dndzone } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';

	const vehicle = $derived($page.data.vehicle);
	const notes = $derived($page.data.notes);
	const repairs = $derived($page.data.repairs);
	const vendors = $derived($page.data.vendors);
	const galleries = $derived($page.data.galleries);

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

	// Gallery modal state
	let galleryModalOpen = $state(false);
	let galleryDeleteModalOpen = $state(false);
	let galleryToDelete = $state<{ id: string; name: string } | null>(null);
	let savingGallery = $state(false);

	// Gallery form state
	let galleryName = $state('');
	let galleryDescription = $state('');

	// Photo modal state
	let photoModalOpen = $state(false);
	let photoDeleteModalOpen = $state(false);
	let photoToDelete = $state<{ id: string; caption: string | null } | null>(null);
	let selectedGalleryId = $state<string | null>(null);

	// Edit photo modal state
	let editPhotoModalOpen = $state(false);
	let editingPhoto = $state<{ id: string; imageUrl: string; caption: string | null } | null>(null);
	let editPhotoCaption = $state('');
	let editPhotoData = $state('');
	let editPhotoRemoved = $state(false);
	let savingEditPhoto = $state(false);

	// Edit gallery modal state
	let editGalleryModalOpen = $state(false);
	let editingGallery = $state<{ id: string; name: string; description: string | null; photos: Array<{ id: string; imageUrl: string; caption: string | null; order: number }> } | null>(null);
	let editGalleryName = $state('');
	let editGalleryDescription = $state('');
	let editGalleryPhotos = $state<Array<{ id: string; imageUrl: string; caption: string | null; order: number }>>([]);
	let savingEditGallery = $state(false);
	const flipDurationMs = 200;

	// Photo viewer state - track gallery and photo index
	let viewingGalleryId = $state<string | null>(null);
	let viewingPhotoIndex = $state<number | null>(null);
	const viewingGallery = $derived(viewingGalleryId ? galleries.find((g: { id: string }) => g.id === viewingGalleryId) : null);
	const viewingPhoto = $derived(viewingGallery && viewingPhotoIndex !== null ? viewingGallery.photos[viewingPhotoIndex] : null);

	// Keyboard navigation for photo viewer
	$effect(() => {
		if (viewingPhotoIndex === null || !viewingGallery) return;

		function handleKeydown(e: KeyboardEvent) {
			if (e.key === 'ArrowRight') {
				e.preventDefault();
				if (viewingPhotoIndex !== null && viewingGallery && viewingPhotoIndex < viewingGallery.photos.length - 1) {
					viewingPhotoIndex = viewingPhotoIndex + 1;
				}
			} else if (e.key === 'ArrowLeft') {
				e.preventDefault();
				if (viewingPhotoIndex !== null && viewingPhotoIndex > 0) {
					viewingPhotoIndex = viewingPhotoIndex - 1;
				}
			} else if (e.key === 'Escape') {
				viewingPhotoIndex = null;
				viewingGalleryId = null;
			}
		}

		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});

	// Photo form state
	let photoCaption = $state('');
	let selectedPhoto = $state<File | null>(null);
	let photoData = $state('');
	let savingPhoto = $state(false);

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

	function resetPhotoForm() {
		photoCaption = '';
		selectedPhoto = null;
		photoData = '';
		selectedGalleryId = null;
	}

	function resetGalleryForm() {
		galleryName = '';
		galleryDescription = '';
	}

	function openEditPhotoModal(photo: { id: string; imageUrl: string; caption: string | null }) {
		editingPhoto = photo;
		editPhotoCaption = photo.caption || '';
		editPhotoData = '';
		editPhotoRemoved = false;
		editPhotoModalOpen = true;
	}

	function resetEditPhotoForm() {
		editingPhoto = null;
		editPhotoCaption = '';
		editPhotoData = '';
		editPhotoRemoved = false;
	}

	function handleEditPhotoSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = () => {
				editPhotoData = reader.result as string;
				editPhotoRemoved = false;
			};
			reader.readAsDataURL(file);
		}
	}

	function openEditGalleryModal(gallery: { id: string; name: string; description: string | null; photos: Array<{ id: string; imageUrl: string; caption: string | null; order: number }> }) {
		editingGallery = gallery;
		editGalleryName = gallery.name;
		editGalleryDescription = gallery.description || '';
		editGalleryPhotos = [...gallery.photos].sort((a, b) => a.order - b.order);
		editGalleryModalOpen = true;
	}

	function resetEditGalleryForm() {
		editingGallery = null;
		editGalleryName = '';
		editGalleryDescription = '';
		editGalleryPhotos = [];
	}

	function handleDndConsider(e: CustomEvent<{ items: typeof editGalleryPhotos }>) {
		editGalleryPhotos = e.detail.items;
	}

	function handleDndFinalize(e: CustomEvent<{ items: typeof editGalleryPhotos }>) {
		editGalleryPhotos = e.detail.items;
	}

	function handlePhotoSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			selectedPhoto = file;
			const reader = new FileReader();
			reader.onload = () => {
				photoData = reader.result as string;
			};
			reader.readAsDataURL(file);
		}
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
							<p class="text-xs text-surface-500 dark:text-gray-300">Year</p>
							<p class="text-sm font-medium text-black dark:text-white">{vehicle.year}</p>
						</div>
					</div>

					<div class="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-700/50 rounded-lg">
						<Car class="w-5 h-5 text-surface-400" />
						<div>
							<p class="text-xs text-surface-500 dark:text-gray-300">Make & Model</p>
							<p class="text-sm font-medium text-black dark:text-white">{vehicle.make} {vehicle.model}</p>
						</div>
					</div>

					{#if vehicle.vin}
						<div class="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-700/50 rounded-lg">
							<Hash class="w-5 h-5 text-surface-400" />
							<div>
								<p class="text-xs text-surface-500 dark:text-gray-300">VIN</p>
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
						class="btn inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg transition-colors"
						onclick={() => repairModalOpen = true}
					>
						<Plus class="w-4 h-4" />
						Add Repair
					</button>
				</div>

				{#if repairs.length === 0}
					<div class="text-center py-8">
						<Wrench class="w-12 h-12 mx-auto text-surface-300 dark:text-gray-400 mb-3" />
						<p class="text-surface-500 dark:text-gray-300 text-sm">No repairs yet</p>
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
											<div class="flex flex-wrap items-center gap-2 text-xs text-surface-500 dark:text-gray-300 mt-1">
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
												<div class="flex items-center gap-1 text-xs text-surface-500 dark:text-gray-300 mt-1">
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

		<!-- Galleries Section (Full Width) -->
		<div class="max-w-5xl mx-auto mt-6">
			<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5 border border-[#eee]">
				<div class="flex items-center justify-between mb-6">
					<h2 class="text-lg font-bold text-black dark:text-white flex items-center gap-2">
						<Camera class="w-5 h-5" />
						Galleries
					</h2>
					<button
						type="button"
						class="btn inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg transition-colors"
						onclick={() => galleryModalOpen = true}
					>
						<Plus class="w-4 h-4" />
						Add Gallery
					</button>
				</div>

				{#if galleries.length === 0}
					<div class="text-center py-12">
						<Camera class="w-16 h-16 mx-auto text-surface-300 dark:text-gray-400 mb-4" />
						<p class="text-surface-500 dark:text-gray-300">No galleries yet</p>
						<p class="text-surface-400 text-sm mt-1">Create a gallery to organize your vehicle photos</p>
					</div>
				{:else}
					<div class="space-y-8">
						{#each galleries as gallery}
							<div class="border-b border-surface-200 dark:border-surface-700 pb-8 last:border-0 last:pb-0">
								<div class="flex items-center justify-between mb-4">
									<div>
										<h3 class="font-semibold text-black dark:text-white">{gallery.name}</h3>
										{#if gallery.description}
											<p class="text-sm text-surface-500 dark:text-gray-300 mt-0.5">{gallery.description}</p>
										{/if}
									</div>
									<div class="flex items-center gap-1">
										<button
											type="button"
											class="p-2 text-primary-500 hover:text-[#93c5fd] hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
											aria-label="Add photo to gallery"
											onclick={() => { selectedGalleryId = gallery.id; photoModalOpen = true; }}
										>
											<Plus class="w-4 h-4" />
										</button>
										<button
											type="button"
											class="p-2 text-primary-500 hover:text-[#93c5fd] hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
											aria-label="Edit gallery"
											onclick={() => openEditGalleryModal(gallery)}
										>
											<Pencil class="w-4 h-4" />
										</button>
										<button
											type="button"
											class="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
											aria-label="Delete gallery"
											onclick={() => { galleryToDelete = { id: gallery.id, name: gallery.name }; galleryDeleteModalOpen = true; }}
										>
											<Trash2 class="w-4 h-4" />
										</button>
									</div>
								</div>

								{#if gallery.photos.length === 0}
									<div class="text-center py-8 bg-surface-50 dark:bg-surface-700/30 rounded-xl">
										<ImageIcon class="w-10 h-10 mx-auto text-surface-300 dark:text-gray-400 mb-2" />
										<p class="text-surface-500 dark:text-gray-300 text-sm">No photos in this gallery</p>
									</div>
								{:else}
									<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
										{#each gallery.photos as photo, index}
											<div class="group relative aspect-square rounded-xl overflow-hidden bg-surface-100 dark:bg-surface-700">
												<button
													type="button"
													class="w-full h-full"
													onclick={() => { viewingGalleryId = gallery.id; viewingPhotoIndex = index; }}
												>
													<img
														src={photo.imageUrl}
														alt={photo.caption || 'Vehicle photo'}
														class="w-full h-full object-cover"
													/>
												</button>
												<div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none"></div>
												<div class="absolute bottom-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
													<button
														type="button"
														class="p-2 bg-white/90 dark:bg-surface-800/90 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
														aria-label="Edit photo"
														onclick={(e) => { e.stopPropagation(); openEditPhotoModal(photo); }}
													>
														<Pencil class="w-4 h-4" />
													</button>
													<button
														type="button"
														class="p-2 bg-white/90 dark:bg-surface-800/90 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
														aria-label="Delete photo"
														onclick={(e) => { e.stopPropagation(); photoToDelete = { id: photo.id, caption: photo.caption }; photoDeleteModalOpen = true; }}
													>
														<Trash2 class="w-4 h-4" />
													</button>
												</div>
												{#if photo.caption}
													<div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-8">
														<p class="text-white text-sm truncate">{photo.caption}</p>
													</div>
												{/if}
											</div>
										{/each}
									</div>
								{/if}
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
					<label for="repair-description" class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">
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
						<label for="repair-date" class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">
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
						<label for="repair-mileage" class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">
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
						<label for="repair-cost" class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">
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
						<label for="repair-status" class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">
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
					<label for="repair-vendor" class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">
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
						<p class="text-xs text-surface-500 dark:text-gray-300 mt-1">
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

<!-- Create Gallery Modal -->
{#if galleryModalOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onclick={(e) => { if (e.target === e.currentTarget) galleryModalOpen = false; }}>
		<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
			<h3 class="text-lg font-bold text-black dark:text-white mb-4">New Gallery</h3>

			<form
				method="POST"
				action="?/createGallery"
				use:enhance={() => {
					savingGallery = true;
					return async ({ update }) => {
						await update();
						savingGallery = false;
						galleryModalOpen = false;
						resetGalleryForm();
					};
				}}
				class="space-y-4"
			>
				<div>
					<label for="gallery-name" class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">
						Gallery Name <span class="text-red-500">*</span>
					</label>
					<input
						type="text"
						id="gallery-name"
						name="name"
						bind:value={galleryName}
						placeholder="e.g., Exterior, Interior, Engine Bay"
						class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
						required
					/>
				</div>

				<div>
					<label for="gallery-description" class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">
						Description (optional)
					</label>
					<input
						type="text"
						id="gallery-description"
						name="description"
						bind:value={galleryDescription}
						placeholder="e.g., Photos of the car exterior"
						class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
					/>
				</div>

				<div class="flex gap-3 pt-4">
					<button
						type="button"
						class="flex-1 btn preset-outlined-surface-500 py-2.5 rounded-lg font-semibold"
						onclick={() => { galleryModalOpen = false; resetGalleryForm(); }}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="flex-1 btn preset-filled-primary-500 py-2.5 rounded-lg font-semibold text-white disabled:opacity-50"
						disabled={!galleryName.trim() || savingGallery}
					>
						{savingGallery ? 'Creating...' : 'Create Gallery'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Edit Gallery Modal -->
{#if editGalleryModalOpen && editingGallery}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onclick={(e) => { if (e.target === e.currentTarget) { editGalleryModalOpen = false; resetEditGalleryForm(); } }}>
		<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
			<h3 class="text-lg font-bold text-black dark:text-white mb-4">Edit Gallery</h3>

			<form
				method="POST"
				action="?/updateGallery"
				use:enhance={() => {
					savingEditGallery = true;
					return async ({ update }) => {
						await update();
						savingEditGallery = false;
						editGalleryModalOpen = false;
						resetEditGalleryForm();
					};
				}}
				class="space-y-4"
			>
				<div>
					<label for="edit-gallery-name" class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">
						Gallery Name <span class="text-red-500">*</span>
					</label>
					<input
						type="text"
						id="edit-gallery-name"
						name="name"
						bind:value={editGalleryName}
						placeholder="e.g., Exterior, Interior, Engine Bay"
						class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
						required
					/>
				</div>

				<div>
					<label for="edit-gallery-description" class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">
						Description (optional)
					</label>
					<input
						type="text"
						id="edit-gallery-description"
						name="description"
						bind:value={editGalleryDescription}
						placeholder="e.g., Photos of the car exterior"
						class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
					/>
				</div>

				{#if editGalleryPhotos.length > 0}
					<div>
						<div class="flex items-center justify-between mb-2">
							<div>
								<span class="text-xs font-medium text-surface-600 dark:text-gray-300 block">Gallery Images</span>
								<span class="text-xs text-surface-400 dark:text-gray-400">(Drag images to rearrange order)</span>
							</div>
							<button
								type="button"
								class="p-2 text-primary-500 hover:text-[#93c5fd] hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
								aria-label="Add photo to gallery"
								onclick={() => { selectedGalleryId = editingGallery?.id || ''; editGalleryModalOpen = false; photoModalOpen = true; }}
							>
								<Plus class="w-4 h-4" />
							</button>
						</div>
						<div
							class="grid grid-cols-3 gap-3"
							use:dndzone={{ items: editGalleryPhotos, flipDurationMs, type: 'gallery-photos' }}
							onconsider={handleDndConsider}
							onfinalize={handleDndFinalize}
						>
							{#each editGalleryPhotos as photo (photo.id)}
								<div
									class="relative aspect-square rounded-lg overflow-hidden bg-surface-100 dark:bg-surface-700 cursor-grab active:cursor-grabbing group"
									animate:flip={{ duration: flipDurationMs }}
								>
									<img
										src={photo.imageUrl}
										alt={photo.caption || 'Photo'}
										class="w-full h-full object-cover"
									/>
									<div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
										<GripVertical class="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
									</div>
									<!-- Edit/Delete icons in top right -->
									<div class="absolute top-1 right-1 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
										<button
											type="button"
											class="p-1.5 bg-white/90 dark:bg-surface-800/90 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
											aria-label="Edit photo"
											onclick={(e) => { e.stopPropagation(); editGalleryModalOpen = false; openEditPhotoModal(photo); }}
										>
											<Pencil class="w-3 h-3" />
										</button>
										<button
											type="button"
											class="p-1.5 bg-white/90 dark:bg-surface-800/90 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
											aria-label="Delete photo"
											onclick={(e) => { e.stopPropagation(); photoToDelete = { id: photo.id, caption: photo.caption }; photoDeleteModalOpen = true; editGalleryModalOpen = false; }}
										>
											<Trash2 class="w-3 h-3" />
										</button>
									</div>
									{#if photo.caption}
										<div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 pt-6">
											<p class="text-white text-xs truncate">{photo.caption}</p>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{:else}
					<div>
						<div class="flex items-center justify-between mb-2">
							<span class="text-xs font-medium text-surface-600 dark:text-gray-300">Gallery Images</span>
							<button
								type="button"
								class="p-2 text-primary-500 hover:text-[#93c5fd] hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
								aria-label="Add photo to gallery"
								onclick={() => { selectedGalleryId = editingGallery?.id || ''; editGalleryModalOpen = false; photoModalOpen = true; }}
							>
								<Plus class="w-4 h-4" />
							</button>
						</div>
						<div class="text-center py-6 bg-surface-50 dark:bg-surface-700/30 rounded-xl">
							<ImageIcon class="w-8 h-8 mx-auto text-surface-300 dark:text-gray-400 mb-2" />
							<p class="text-surface-500 dark:text-gray-300 text-sm">No photos in this gallery</p>
						</div>
					</div>
				{/if}

				<input type="hidden" name="galleryId" value={editingGallery.id} />
				<input type="hidden" name="photoOrder" value={JSON.stringify(editGalleryPhotos.map((p, i) => ({ id: p.id, order: i })))} />

				<div class="flex gap-3 pt-4">
					<button
						type="button"
						class="flex-1 btn preset-outlined-surface-500 py-2.5 rounded-lg font-semibold"
						onclick={() => { editGalleryModalOpen = false; resetEditGalleryForm(); }}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="flex-1 btn preset-filled-primary-500 py-2.5 rounded-lg font-semibold text-white disabled:opacity-50"
						disabled={!editGalleryName.trim() || savingEditGallery}
					>
						{savingEditGallery ? 'Saving...' : 'Save Changes'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Add Photo Modal -->
{#if photoModalOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onclick={(e) => { if (e.target === e.currentTarget) photoModalOpen = false; }}>
		<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
			<h3 class="text-lg font-bold text-black dark:text-white mb-4">Add Photo</h3>

			<form
				method="POST"
				action="?/addPhoto"
				use:enhance={() => {
					savingPhoto = true;
					return async ({ update }) => {
						await update();
						savingPhoto = false;
						photoModalOpen = false;
						resetPhotoForm();
					};
				}}
				class="space-y-4"
			>
				<div>
					<label for="photo-file" class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">
						Photo <span class="text-red-500">*</span>
					</label>
					<input
						type="file"
						id="photo-file"
						accept="image/*"
						onchange={handlePhotoSelect}
						class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-primary-500 file:text-white file:text-sm file:font-medium file:cursor-pointer"
						required
					/>
					{#if photoData}
						<div class="mt-3 relative">
							<img src={photoData} alt="Preview" class="w-full max-h-48 rounded-lg object-contain bg-surface-100 dark:bg-surface-700" />
							<button
								type="button"
								class="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
								onclick={() => { selectedPhoto = null; photoData = ''; }}
							>
								<X class="w-4 h-4" />
							</button>
						</div>
					{/if}
				</div>

				<div>
					<label for="photo-caption" class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">
						Caption (optional)
					</label>
					<input
						type="text"
						id="photo-caption"
						name="caption"
						bind:value={photoCaption}
						placeholder="e.g., Front view, Interior, Engine bay"
						class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
					/>
				</div>

				<input type="hidden" name="fileData" value={photoData} />
				<input type="hidden" name="galleryId" value={selectedGalleryId || ''} />

				<div class="flex gap-3 pt-4">
					<button
						type="button"
						class="flex-1 btn preset-outlined-surface-500 py-2.5 rounded-lg font-semibold"
						onclick={() => { photoModalOpen = false; resetPhotoForm(); }}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="flex-1 btn preset-filled-primary-500 py-2.5 rounded-lg font-semibold text-white disabled:opacity-50"
						disabled={!photoData || !selectedGalleryId || savingPhoto}
					>
						{savingPhoto ? 'Uploading...' : 'Add Photo'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Edit Photo Modal -->
{#if editPhotoModalOpen && editingPhoto}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onclick={(e) => { if (e.target === e.currentTarget) { editPhotoModalOpen = false; resetEditPhotoForm(); } }}>
		<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
			<h3 class="text-lg font-bold text-black dark:text-white mb-4">Edit Image</h3>

			<form
				method="POST"
				action="?/updatePhoto"
				use:enhance={() => {
					savingEditPhoto = true;
					return async ({ update }) => {
						await update();
						savingEditPhoto = false;
						editPhotoModalOpen = false;
						resetEditPhotoForm();
					};
				}}
				class="space-y-4"
			>
				<!-- Current/New Image Preview -->
				<div>
					{#if !editPhotoRemoved && (editPhotoData || editingPhoto.imageUrl)}
						<div class="group relative mb-3">
							<img
								src={editPhotoData || editingPhoto.imageUrl}
								alt="Current photo"
								class="w-full max-h-48 rounded-lg object-contain bg-surface-100 dark:bg-surface-700"
							/>
							<div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg"></div>
							<button
								type="button"
								class="absolute top-2 right-2 p-2 bg-white/90 dark:bg-surface-800/90 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
								onclick={() => { editPhotoData = ''; editPhotoRemoved = true; }}
								aria-label="Remove image"
							>
								<Trash2 class="w-4 h-4" />
							</button>
						</div>
					{/if}

					<label for="edit-photo-file" class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">
						{editPhotoRemoved ? 'New Photo' : 'Replace Photo'} {editPhotoRemoved ? '' : '(optional)'}
						{#if editPhotoRemoved}<span class="text-red-500">*</span>{/if}
					</label>
					<input
						type="file"
						id="edit-photo-file"
						accept="image/*"
						onchange={handleEditPhotoSelect}
						class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-primary-500 file:text-white file:text-sm file:font-medium file:cursor-pointer"
					/>
				</div>

				<div>
					<label for="edit-photo-caption" class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">
						Caption (optional)
					</label>
					<input
						type="text"
						id="edit-photo-caption"
						name="caption"
						bind:value={editPhotoCaption}
						placeholder="e.g., Front view, Interior, Engine bay"
						class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
					/>
				</div>

				<input type="hidden" name="photoId" value={editingPhoto.id} />
				<input type="hidden" name="fileData" value={editPhotoData} />
				<input type="hidden" name="removeImage" value={editPhotoRemoved ? 'true' : 'false'} />

				<div class="flex gap-3 pt-4">
					<button
						type="button"
						class="flex-1 btn preset-outlined-surface-500 py-2.5 rounded-lg font-semibold"
						onclick={() => { editPhotoModalOpen = false; resetEditPhotoForm(); }}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="flex-1 btn preset-filled-primary-500 py-2.5 rounded-lg font-semibold text-white disabled:opacity-50"
						disabled={(editPhotoRemoved && !editPhotoData) || savingEditPhoto}
					>
						{savingEditPhoto ? 'Saving...' : 'Save Changes'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Photo Viewer Modal -->
{#if viewingPhoto && viewingGallery}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onclick={() => { viewingPhotoIndex = null; viewingGalleryId = null; }}>
		<div class="relative max-w-4xl max-h-[90vh] w-full">
			<!-- Close button -->
			<button
				type="button"
				class="absolute -top-10 right-0 p-2 text-white hover:text-surface-300 transition-colors"
				onclick={() => { viewingPhotoIndex = null; viewingGalleryId = null; }}
			>
				<X class="w-6 h-6" />
			</button>

			<!-- Photo counter -->
			<div class="absolute -top-10 left-0 text-white/70 text-sm">
				{viewingPhotoIndex !== null ? viewingPhotoIndex + 1 : 0} of {viewingGallery.photos.length}
			</div>

			<!-- Previous button -->
			{#if viewingPhotoIndex !== null && viewingPhotoIndex > 0}
				<button
					type="button"
					class="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 p-2 text-white hover:text-surface-300 transition-colors"
					onclick={(e) => { e.stopPropagation(); if (viewingPhotoIndex !== null) viewingPhotoIndex = viewingPhotoIndex - 1; }}
					aria-label="Previous photo"
				>
					<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
				</button>
			{/if}

			<!-- Next button -->
			{#if viewingPhotoIndex !== null && viewingGallery && viewingPhotoIndex < viewingGallery.photos.length - 1}
				<button
					type="button"
					class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 p-2 text-white hover:text-surface-300 transition-colors"
					onclick={(e) => { e.stopPropagation(); if (viewingPhotoIndex !== null) viewingPhotoIndex = viewingPhotoIndex + 1; }}
					aria-label="Next photo"
				>
					<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</button>
			{/if}

			<img
				src={viewingPhoto.imageUrl}
				alt={viewingPhoto.caption || 'Vehicle photo'}
				class="w-full h-full object-contain rounded-lg"
				onclick={(e) => e.stopPropagation()}
			/>
			{#if viewingPhoto.caption}
				<p class="text-white text-center mt-4">{viewingPhoto.caption}</p>
			{/if}
		</div>
	</div>
{/if}

<!-- Delete Gallery Confirmation Modal -->
<ConfirmModal
	open={galleryDeleteModalOpen}
	title="Delete Gallery"
	message={galleryToDelete ? `Are you sure you want to delete "${galleryToDelete.name}" and all its photos? This action cannot be undone.` : ''}
	confirmText="Delete"
	onConfirm={() => {
		if (galleryToDelete) {
			const form = document.getElementById(`delete-gallery-form-${galleryToDelete.id}`) as HTMLFormElement;
			form?.requestSubmit();
		}
		galleryDeleteModalOpen = false;
		galleryToDelete = null;
	}}
	onCancel={() => {
		galleryDeleteModalOpen = false;
		galleryToDelete = null;
	}}
/>

<!-- Hidden delete forms for galleries -->
{#each galleries as gallery}
	<form method="POST" action="?/deleteGallery" use:enhance class="hidden" id="delete-gallery-form-{gallery.id}">
		<input type="hidden" name="galleryId" value={gallery.id} />
	</form>
{/each}

<!-- Delete Photo Confirmation Modal -->
<ConfirmModal
	open={photoDeleteModalOpen}
	title="Delete Photo"
	message={photoToDelete ? `Are you sure you want to delete this photo${photoToDelete.caption ? ` "${photoToDelete.caption}"` : ''}? This action cannot be undone.` : ''}
	confirmText="Delete"
	onConfirm={() => {
		if (photoToDelete) {
			const form = document.getElementById(`delete-photo-form-${photoToDelete.id}`) as HTMLFormElement;
			form?.requestSubmit();
		}
		photoDeleteModalOpen = false;
		photoToDelete = null;
	}}
	onCancel={() => {
		photoDeleteModalOpen = false;
		photoToDelete = null;
	}}
/>

<!-- Hidden delete forms for photos -->
{#each galleries as gallery}
	{#each gallery.photos as photo}
		<form method="POST" action="?/deletePhoto" use:enhance class="hidden" id="delete-photo-form-{photo.id}">
			<input type="hidden" name="photoId" value={photo.id} />
		</form>
	{/each}
{/each}
