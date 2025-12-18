<script lang="ts">
	import { enhance } from '$app/forms';
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import { page } from '$app/stores';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	const user = $derived($page.data.user);
	const profileUser = $derived($page.data.profileUser);
	const isOwnProfile = $derived(user?.uuid === profileUser?.uuid);
	let resendingEmail = $state(false);
</script>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900 flex flex-col">
	<Navbar />

	<!-- Breadcrumbs -->
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
		{#if isOwnProfile}
			<Breadcrumbs items={[{ label: 'Profile' }]} />
		{:else}
			<Breadcrumbs items={[{ label: 'Users', href: '/users' }, { label: profileUser.username }]} />
		{/if}
	</div>

	<!-- Main Content -->
	<main class="flex-1 flex items-start justify-center pt-12 px-4 sm:px-6 lg:px-8">
		<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5 w-full max-w-sm border border-[#eee]">
			<!-- Email Verification Banner -->
			{#if isOwnProfile && profileUser.emailVerified === 0}
				<div class="mb-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
					<div class="flex items-start gap-3">
						<svg class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
						</svg>
						<div class="flex-1">
							<p class="text-sm font-medium text-amber-800 dark:text-amber-200">Email not verified</p>
							<p class="text-xs text-amber-600 dark:text-amber-400 mt-1">Please check your inbox and click the verification link.</p>
							<form method="POST" action="?/resendVerification" use:enhance={() => {
								resendingEmail = true;
								return async ({ update }) => {
									await update();
									resendingEmail = false;
								};
							}}>
								<button
									type="submit"
									disabled={resendingEmail}
									class="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 underline disabled:opacity-50"
								>
									{resendingEmail ? 'Sending...' : 'Resend verification email'}
								</button>
							</form>
							{#if form?.message}
								<p class="mt-2 text-xs {form?.success ? 'text-green-600' : 'text-red-600'}">{form.message}</p>
							{/if}
						</div>
					</div>
				</div>
			{/if}

			<div class="flex flex-col items-center text-center">
				<Avatar class="w-24 h-24 border-2 border-[#ccc] mb-4">
					{#if profileUser.avatar}
						<Avatar.Image src={profileUser.avatar} alt="Avatar" class="rounded-full object-cover" />
					{:else}
						<Avatar.Fallback class="preset-filled-primary-500 rounded-full text-2xl">{profileUser.username?.charAt(0).toUpperCase()}</Avatar.Fallback>
					{/if}
				</Avatar>
				<h1 class="text-sm font-medium text-surface-600 dark:text-surface-400 mb-1">{profileUser.username}</h1>
				{#if profileUser.admin}
					<span class="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-medium bg-primary-500/10 text-primary-600 dark:text-primary-400">
						Admin
					</span>
				{/if}
			</div>

			{#if user?.uuid === profileUser.uuid}
				<div class="mt-8 pt-6 border-t border-surface-200 dark:border-surface-700">
					<a href="/users/{profileUser.uuid}/edit" class="w-full btn preset-filled-primary-500 py-2.5 rounded-lg font-semibold text-white block text-center">
						Edit Profile
					</a>
				</div>
			{/if}
		</div>
	</main>

	<Footer />
</div>
