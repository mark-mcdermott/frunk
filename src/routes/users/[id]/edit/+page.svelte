<script lang="ts">
	import { enhance } from '$app/forms';
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { page } from '$app/stores';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	const user = $derived($page.data.user);
	const profileUser = $derived($page.data.profileUser);
	const isAdminEditing = $derived($page.data.isAdminEditing);

	let fileInputAdmin: HTMLInputElement;
	let fileInputUser: HTMLInputElement;
	let avatarPreview = $state<string | null>(null);
	let avatarDataUrl = $state<string>('');

	// Delete confirmation modal state (admin deleting user)
	let deleteModalOpen = $state(false);
	let deleteFormEl: HTMLFormElement | null = null;

	// Delete account modal state (user deleting own account)
	let deleteAccountModalOpen = $state(false);
	let deleteAccountFormEl: HTMLFormElement | null = null;

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		// Validate file type
		if (!file.type.startsWith('image/')) {
			alert('Please select an image file');
			return;
		}

		// Validate file size (max 1MB for base64 storage)
		if (file.size > 1024 * 1024) {
			alert('Image must be less than 1MB');
			return;
		}

		const reader = new FileReader();
		reader.onload = (e) => {
			const result = e.target?.result as string;
			avatarPreview = result;
			avatarDataUrl = result;
		};
		reader.readAsDataURL(file);
	}

	// Get the current avatar to display (preview takes priority)
	const displayAvatar = $derived(avatarPreview || profileUser?.avatar);
</script>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900 flex flex-col">
	<Navbar />

	<!-- Breadcrumbs -->
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
		{#if isAdminEditing}
			<Breadcrumbs items={[{ label: 'Users', href: '/users' }, { label: 'Edit User' }]} />
		{:else}
			<Breadcrumbs items={[{ label: 'Settings' }]} />
		{/if}
	</div>

	<!-- Main Content -->
	<main class="flex-1 flex items-start justify-center pt-12 px-4 sm:px-6 lg:px-8">
		<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5 w-full max-w-sm border border-[#eee]">
			{#if isAdminEditing}
				<!-- Admin Edit View -->
				<h3 class="text-xl font-bold text-black dark:text-white mb-2">Edit User</h3>
				<p class="text-sm text-surface-500 dark:text-gray-300 mb-6">Update user settings.</p>

				<form method="post" action="?/update" use:enhance class="space-y-4">
					<!-- Avatar Display -->
					<div>
						<label class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">Avatar</label>
						<input
							type="file"
							accept="image/*"
							class="hidden"
							bind:this={fileInputAdmin}
							onchange={handleFileSelect}
						/>
						<button type="button" class="relative w-16 h-16 group cursor-pointer" onclick={() => fileInputAdmin.click()}>
							<Avatar class="w-16 h-16 border-2 border-[#ddd] group-hover:border-primary-500 transition-colors">
								{#if displayAvatar}
									<Avatar.Image src={displayAvatar} alt="Avatar" class="rounded-full object-cover" />
								{:else}
									<Avatar.Fallback class="preset-filled-primary-500 rounded-full text-xl">{profileUser.username?.charAt(0).toUpperCase()}</Avatar.Fallback>
								{/if}
							</Avatar>
							<div class="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
								<svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
								</svg>
							</div>
						</button>
					</div>
					<input type="hidden" name="avatarUpload" value={avatarDataUrl} />
					<div>
						<label for="id-display" class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">User ID</label>
						<input id="id-display" type="text" value={profileUser.id} disabled class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm text-surface-500 dark:text-gray-300 cursor-not-allowed" />
					</div>
					<div>
						<label for="uuid-display" class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">User UUID</label>
						<input id="uuid-display" type="text" value={profileUser.uuid} disabled class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm text-surface-500 dark:text-gray-300 cursor-not-allowed" />
					</div>
					<div>
						<label for="username-input" class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">Email</label>
						<input id="username-input" name="username" type="email" value={profileUser.username} placeholder="me@example.com" class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500" />
					</div>
					<div>
						<label for="avatar-input" class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">Avatar URL</label>
						<input id="avatar-input" name="avatar" type="url" value={avatarPreview ? '' : (profileUser.avatar || '')} placeholder="https://example.com/avatar.png" class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500" />
					</div>
					<div class="flex gap-3">
						<button type="submit" class="flex-1 btn preset-filled-primary-500 py-2.5 rounded-lg font-semibold text-white">
							Save
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
			{:else}
				<!-- User Edit Own Profile View -->
				<h3 class="text-xl font-bold text-black dark:text-white mb-2">Settings</h3>
				<p class="text-sm text-surface-500 dark:text-gray-300 mb-6">Update your account settings.</p>

				<!-- Avatar Display -->
				<div class="flex justify-center mb-6">
					<input
						type="file"
						accept="image/*"
						class="hidden"
						bind:this={fileInputUser}
						onchange={handleFileSelect}
					/>
					<button type="button" class="relative w-20 h-20 group cursor-pointer" onclick={() => fileInputUser.click()}>
						<Avatar class="w-20 h-20 border-2 border-[#ddd] group-hover:border-primary-500 transition-colors">
							{#if displayAvatar}
								<Avatar.Image src={displayAvatar} alt="Avatar" class="rounded-full object-cover" />
							{:else}
								<Avatar.Fallback class="preset-filled-primary-500 rounded-full text-2xl">{profileUser.username?.charAt(0).toUpperCase()}</Avatar.Fallback>
							{/if}
						</Avatar>
						<div class="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
							<svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
							</svg>
						</div>
					</button>
				</div>

				<form method="post" action="?/update" use:enhance class="space-y-4">
					<input type="hidden" name="avatarUpload" value={avatarDataUrl} />
					<div>
						<label for="username-input" class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">Email</label>
						<input id="username-input" name="username" type="email" value={profileUser.username} placeholder="me@example.com" class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500" />
					</div>
					<div>
						<label for="avatar-input" class="text-xs font-medium text-surface-600 dark:text-gray-300 block mb-1">Avatar URL</label>
						<input id="avatar-input" name="avatar" type="url" value={avatarPreview ? '' : (profileUser.avatar || '')} placeholder="https://example.com/avatar.png" class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500" />
					</div>
					<div class="flex gap-3">
						<button type="submit" class="flex-1 btn preset-filled-primary-500 py-2.5 rounded-lg font-semibold text-white">
							Save Changes
						</button>
						<a href="/users/{profileUser.uuid}" class="flex-1 btn preset-outlined-surface-500 py-2.5 rounded-lg font-semibold block text-center">
							Cancel
						</a>
					</div>
				</form>

				<!-- Delete Account Section -->
				<div class="mt-8 pt-6 border-t border-surface-200 dark:border-surface-700">
					<h4 class="text-sm font-semibold text-red-500 mb-2">Danger Zone</h4>
					<p class="text-xs text-surface-500 dark:text-gray-300 mb-4">Permanently delete your account and all associated data.</p>
					<button
						type="button"
						class="w-full btn py-2.5 rounded-lg font-semibold border border-red-500 bg-transparent text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
						onclick={() => deleteAccountModalOpen = true}
					>
						Delete Account
					</button>
				</div>
				<form method="POST" action="?/deleteAccount" bind:this={deleteAccountFormEl} class="hidden"></form>
			{/if}
			{#if form?.message}
				<p class="text-red-500 text-sm mt-4">{form.message}</p>
			{/if}
		</div>
	</main>

	<Footer />
</div>

<!-- Delete Confirmation Modal (Admin) -->
<ConfirmModal
	open={deleteModalOpen}
	title="Delete User"
	message={`Are you sure you want to delete ${profileUser.username}? This action cannot be undone.`}
	confirmText="Delete"
	onConfirm={() => {
		deleteFormEl?.requestSubmit();
		deleteModalOpen = false;
	}}
	onCancel={() => {
		deleteModalOpen = false;
	}}
/>

<!-- Delete Account Modal (User) -->
<ConfirmModal
	open={deleteAccountModalOpen}
	title="Delete Your Account"
	message="This will permanently delete your account and all associated data including your vehicles, repairs, notes, vendors, and uploaded files. This action cannot be undone and your data cannot be recovered."
	confirmText="Delete My Account"
	onConfirm={() => {
		deleteAccountFormEl?.requestSubmit();
		deleteAccountModalOpen = false;
	}}
	onCancel={() => {
		deleteAccountModalOpen = false;
	}}
/>
