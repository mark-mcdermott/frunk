<script lang="ts">
	import logo from '$lib/assets/logo.png';

	interface Props {
		class?: string;
	}

	let { class: className = '' }: Props = $props();
</script>

<footer class="border-t border-surface-200 dark:border-surface-800 py-12 px-4 sm:px-6 lg:px-8 {className}">
	<div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
		<div class="flex items-center gap-2">
			<img src={logo} alt="Logo" class="h-12 w-auto" />
		</div>
		<p class="text-sm text-surface-500 flex items-center gap-1">Built with <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"/></svg> by <a href="https://markmcdermott.io" class="text-primary-500 hover:text-[#93c5fd] transition-colors">Mark McDermott</a></p>
	</div>
</footer>
