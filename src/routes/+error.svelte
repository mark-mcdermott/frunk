<script lang="ts">
	import { ThemeToggle } from '$lib/components/ui/theme-toggle';
	import head from '$lib/assets/head.png';
	import logo from '$lib/assets/logo.png';
</script>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900 flex flex-col">
	<!-- Navigation -->
	<nav class="sticky top-0 z-50 bg-surface-50/80 dark:bg-surface-900/80 backdrop-blur-lg border-b border-surface-200 dark:border-surface-800">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between h-16">
				<div class="flex items-center gap-8">
					<!-- Logo -->
					<a href="/" class="flex items-center gap-2" aria-label="Home">
						<img src={head} alt="Logo" class="h-16 w-auto" />
					</a>
					<!-- Nav Links -->
					<div class="hidden md:flex items-center gap-6">
						<a href="/blocks" class="text-surface-600 dark:text-surface-400 hover:text-primary-500 font-medium transition-colors">Blocks</a>
						<a href="/charts" class="text-surface-600 dark:text-surface-400 hover:text-primary-500 font-medium transition-colors">Charts</a>
						<a href="/content" class="text-surface-600 dark:text-surface-400 hover:text-primary-500 font-medium transition-colors">Content</a>
					</div>
				</div>
				<div class="flex items-center gap-4">
					<!-- GitHub -->
					<a href="https://github.com/mark-mcdermott/frunk" class="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors" aria-label="GitHub">
						<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
					</a>
					<!-- Theme Toggle -->
					<ThemeToggle mode="light-dark-system" />
					<!-- Sign In -->
					<a href="/sign-in" class="btn btn-sm preset-filled-primary-500">Sign In</a>
				</div>
			</div>
		</div>
	</nav>

	<!-- Main Content - Centered Card -->
	<main class="flex-1 flex items-start justify-center pt-48 px-4 sm:px-6 lg:px-8">
		<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5 w-full max-w-sm text-center">
			<span class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary-500/10 text-secondary-600 dark:text-secondary-400 text-sm font-medium mb-6">
				404
			</span>
			<p class="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
				<span class="text-transparent bg-clip-text bg-gradient-to-r from-secondary-500 to-primary-500">
					Apologies, this page could not be found.
				</span>
			</p>
		</div>
	</main>

	<!-- Footer -->
	<footer class="border-t border-surface-200 dark:border-surface-800 py-12 px-4 sm:px-6 lg:px-8">
		<div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
			<div class="flex items-center gap-2">
				<img src={logo} alt="Logo" class="h-12 w-auto" />
			</div>
			<p class="text-sm text-surface-500 flex items-center gap-1">Built with <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"/></svg> by <a href="https://markmcdermott.io" class="text-primary-500 hover:text-[#93c5fd] transition-colors">Mark McDermott</a></p>
		</div>
	</footer>
</div>
