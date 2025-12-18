<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageServerData } from './$types';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';

	let { data }: { data: PageServerData } = $props();
</script>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900 py-8 px-4 sm:px-6 lg:px-8">
	<div class="max-w-4xl mx-auto">
		<Breadcrumbs items={[{ label: 'Demo', href: '/demo' }, { label: 'Lucia' }]} />
		<h1>Hi, {data.user.username}!</h1>
		<p>Your user ID is {data.user.uuid}.</p>
		<form method="post" action="?/logout" use:enhance>
			<button>Sign out</button>
		</form>
	</div>
</div>
