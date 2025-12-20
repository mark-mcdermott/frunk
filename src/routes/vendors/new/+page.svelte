<script lang="ts">
	import { enhance } from '$app/forms';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let saving = $state(false);
</script>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900 flex flex-col">
	<Navbar />

	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
		<Breadcrumbs items={[
			{ label: 'Vendors', href: '/vendors' },
			{ label: 'New Vendor' }
		]} />
	</div>

	<main class="flex-1 flex items-start justify-center pt-12 px-4 sm:px-6 lg:px-8">
		<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5 w-full max-w-sm border border-[#eee]">
			<h3 class="text-xl font-bold text-black dark:text-white mb-2">Add Vendor</h3>
			<p class="text-sm text-surface-500 mb-6">Add a new repair shop or service provider.</p>

			<form
				method="post"
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
					<label for="name-input" class="text-xs font-medium text-surface-600 dark:text-surface-400 block mb-1">
						Name <span class="text-red-500">*</span>
					</label>
					<input
						id="name-input"
						name="name"
						type="text"
						placeholder="Joe's Auto Shop"
						class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
						required
					/>
				</div>
				<div>
					<label for="phone-input" class="text-xs font-medium text-surface-600 dark:text-surface-400 block mb-1">
						Phone <span class="text-surface-400">(optional)</span>
					</label>
					<input
						id="phone-input"
						name="phone"
						type="tel"
						placeholder="(555) 123-4567"
						class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
					/>
				</div>
				<div>
					<label for="address-input" class="text-xs font-medium text-surface-600 dark:text-surface-400 block mb-1">
						Address <span class="text-surface-400">(optional)</span>
					</label>
					<input
						id="address-input"
						name="address"
						type="text"
						placeholder="123 Main St, City, State"
						class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
					/>
				</div>
				<div>
					<label for="website-input" class="text-xs font-medium text-surface-600 dark:text-surface-400 block mb-1">
						Website <span class="text-surface-400">(optional)</span>
					</label>
					<input
						id="website-input"
						name="website"
						type="url"
						placeholder="https://example.com"
						class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
					/>
				</div>
				<div class="flex gap-3 pt-2">
					<a
						href="/vendors"
						class="flex-1 btn preset-outlined-surface-500 py-2.5 rounded-lg font-semibold text-center"
					>
						Cancel
					</a>
					<button
						type="submit"
						class="flex-1 btn preset-filled-primary-500 py-2.5 rounded-lg font-semibold text-white disabled:opacity-50"
						disabled={saving}
					>
						{saving ? 'Adding...' : 'Add Vendor'}
					</button>
				</div>
			</form>
			{#if form?.message}
				<p class="text-red-500 text-sm mt-4">{form.message}</p>
			{/if}
		</div>
	</main>

	<Footer />
</div>
