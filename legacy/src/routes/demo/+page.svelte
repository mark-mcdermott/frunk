<script lang="ts">
	import { resolve } from '$app/paths';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
</script>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900 py-8 px-4 sm:px-6 lg:px-8">
	<Breadcrumbs items={[{ label: 'Demo' }]} />
	<div class="max-w-4xl mx-auto">
		<a href={resolve('/demo/lucia')}>lucia</a>
	</div>
</div>
