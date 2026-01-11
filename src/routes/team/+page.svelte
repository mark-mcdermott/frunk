<script lang="ts">
	import type { PageData } from './$types';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';

	let { data }: { data: PageData } = $props();

	// Convert username to display name
	function formatName(username: string): string {
		return username
			.split('-')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}
</script>

<svelte:head>
	<title>Team - Frunk</title>
	<meta name="description" content="Meet the team at Frunk" />
</svelte:head>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900 py-8 px-4 sm:px-6 lg:px-8">
	<div class="max-w-4xl mx-auto">
		<Breadcrumbs items={[{ label: 'Team' }]} />
		<h1 class="text-4xl font-bold text-surface-900 dark:text-white mb-2">The Team</h1>
		<p class="text-surface-600 dark:text-gray-300 mb-8">Meet the people of Dunder Mifflin Scranton</p>

		{#if data.users.length === 0}
			<div class="bg-white dark:bg-surface-800 rounded-2xl p-8 shadow-xl">
				<p class="text-surface-600 dark:text-gray-300">
					No team members yet. Run <code class="bg-surface-100 dark:bg-surface-700 px-2 py-1 rounded">pnpm db:seed-office</code> to add The Office characters.
				</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each data.users as member}
					<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5 hover:shadow-2xl transition-shadow">
						<div class="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-xl font-bold text-white mb-4">
							{formatName(member.username).charAt(0)}
						</div>
						<h3 class="font-semibold text-surface-900 dark:text-white">{formatName(member.username)}</h3>
						<p class="text-sm text-surface-500 dark:text-gray-300">@{member.username}</p>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
