<script lang="ts">
	import { enhance } from '$app/forms';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900 flex flex-col">
	<Navbar />

	<!-- Breadcrumbs -->
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
		<Breadcrumbs items={[{ label: 'Sign In' }]} />
	</div>

	<!-- Main Content - Centered Form -->
	<main class="flex-1 flex items-start justify-center pt-12 px-4 sm:px-6 lg:px-8">
		<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5 w-full max-w-sm border border-[#eee]">
			<h3 class="text-xl font-bold text-black dark:text-white mb-2">Sign In</h3>
			<p class="text-sm text-surface-500 mb-6">Complete the form to sign in.</p>

			<!-- <div class="flex gap-3 mb-4">
				<button class="flex-1 btn preset-outlined-surface-500 py-2 rounded-lg text-sm font-medium">GitHub</button>
				<button class="flex-1 btn preset-outlined-surface-500 py-2 rounded-lg text-sm font-medium">Google</button>
			</div> -->

			<form method="post" action="?/login" use:enhance class="space-y-4">
				<div>
					<label for="username-input" class="text-xs font-medium text-surface-600 dark:text-surface-400 block mb-1">Email</label>
					<input id="username-input" name="username" type="email" placeholder="me@example.com" class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500" />
				</div>
				<div>
					<label for="password-input" class="text-xs font-medium text-surface-600 dark:text-surface-400 block mb-1">Password</label>
					<input id="password-input" name="password" type="password" placeholder="Enter your password..." class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500" />
				</div>
				<button type="submit" class="w-full btn preset-filled-primary-500 py-2.5 rounded-lg font-semibold text-white">
					Sign In
				</button>
				<p class="text-xs text-surface-500 text-right">Don't have an account? <a href="/sign-up" class="text-primary-500 hover:text-[#93c5fd] transition-colors">Sign up.</a></p>
			</form>
			{#if form?.message}
				<p class="text-red-500 text-sm mt-4">{form.message}</p>
			{/if}
		</div>
	</main>

	<Footer />
</div>
