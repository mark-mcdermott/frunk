<script lang="ts">
	type BreadcrumbItem = {
		label: string;
		href?: string;
	};

	let { items }: { items: BreadcrumbItem[] } = $props();
</script>

<nav aria-label="Breadcrumb" class="mb-6">
	<ol class="flex items-center gap-2 text-sm">
		<li>
			<a href="/" class="text-surface-500 hover:text-primary-500 transition-colors">Home</a>
		</li>
		{#each items as item, i}
			<li class="text-surface-400" aria-hidden>&rsaquo;</li>
			<li>
				{#if item.href && i < items.length - 1}
					<a href={item.href} class="text-surface-500 hover:text-primary-500 transition-colors">{item.label}</a>
				{:else}
					<span class="text-surface-700 dark:text-surface-300">{item.label}</span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>
