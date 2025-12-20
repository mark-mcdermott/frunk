<script lang="ts">
	import logo from '$lib/assets/wordmark.png';

	interface Props {
		class?: string;
	}

	let { class: className = '' }: Props = $props();
</script>

<footer class="border-t border-surface-200 dark:border-surface-800 py-12 px-4 sm:px-6 lg:px-8 {className}">
	<div class="max-w-7xl mx-auto">
		<div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
			<!-- Logo -->
			<div class="flex items-start">
				<img src={logo} alt="Logo" class="h-12 w-auto" />
			</div>

			<!-- Company Links -->
			<div>
				<h4 class="text-sm font-semibold text-black dark:text-white mb-4">Company</h4>
				<ul class="space-y-2">
					<li><a href="/about" class="text-sm text-surface-500 hover:text-primary-500 transition-colors">About</a></li>
					<li><a href="/contact" class="text-sm text-surface-500 hover:text-primary-500 transition-colors">Contact</a></li>
				</ul>
			</div>

			<!-- Legal Links -->
			<div>
				<h4 class="text-sm font-semibold text-black dark:text-white mb-4">Legal</h4>
				<ul class="space-y-2">
					<li><a href="/privacy" class="text-sm text-surface-500 hover:text-primary-500 transition-colors">Privacy Policy</a></li>
					<li><a href="/legal" class="text-sm text-surface-500 hover:text-primary-500 transition-colors">Terms of Service</a></li>
				</ul>
			</div>

			<!-- Social/Connect -->
			<div>
				<h4 class="text-sm font-semibold text-black dark:text-white mb-4">Connect</h4>
				<ul class="space-y-2">
					<li>
						<a href="https://github.com/mark-mcdermott/frunk" class="text-sm text-surface-500 hover:text-primary-500 transition-colors flex items-center gap-2">
							<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
							GitHub
						</a>
					</li>
				</ul>
			</div>
		</div>

		<!-- Bottom bar -->
		<div class="pt-8 border-t border-surface-200 dark:border-surface-800">
			<p class="text-sm text-surface-500 text-center flex items-center justify-center gap-1">
				Built with <svg class="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"/></svg> by <a href="https://markmcdermott.io" class="text-primary-500 hover:text-[#93c5fd] transition-colors">Mark McDermott</a>
			</p>
		</div>
	</div>
</footer>
