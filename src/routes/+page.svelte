<script lang="ts">
	import { ThemeToggle } from '$lib/components/ui/theme-toggle';
	import head from '$lib/assets/head.png';
	import logo from '$lib/assets/logo.png';
	import wordmark from '$lib/assets/wordmark.png';
	import illustration from '$lib/assets/illustration.png';
</script>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900">
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
					<a href="/demo/lucia/login" class="btn btn-sm preset-filled-primary-500">Sign In</a>
				</div>
			</div>
		</div>
	</nav>

	<!-- Hero Section -->
	<section class="relative overflow-hidden">
		<div class="absolute inset-0 bg-gradient-to-br from-[#012dab]/50 dark:from-[#1e6597]/50 from-35% via-white dark:via-surface-900 via-80% to-secondary-500/50 animate-gradient"></div>

		<div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
			<div class="grid lg:grid-cols-2 gap-12 items-center">
				<div class="text-center lg:text-left">
					<!-- Badge -->
					<a href="#showcase" class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 text-sm font-medium mb-6 hover:bg-primary-500/20 transition-colors animate-pill">
						<span class="relative flex h-2 w-2">
							<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
							<span class="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
						</span>
						New beta launch!
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
					</a>

					<img src={wordmark} alt="Frunk" class="h-28 w-auto mb-4 mx-auto lg:ml-10 lg:mr-auto xl:ml-11" />

					<h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-surface-900 dark:text-white mb-6 leading-tight animate-shadow">
						Your <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#012dab] to-[#012dab]/70 dark:from-[#1e6597] dark:to-[#1e6597]/70">Digital</span>
						<span class="text-transparent bg-clip-text bg-gradient-to-r from-secondary-400 to-secondary-600 text-5xl sm:text-6xl lg:text-7xl block">Glovebox</span>
					</h1>

					<p class="text-lg text-black/90 dark:text-surface-400 mb-8 max-w-xl mx-auto lg:mx-0">
						Store your registration, insurance, maintenance records, and more in one secure place.
						Access everything from your phone, anytime you need it.
					</p>

					<div class="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
						<a href="#showcase" class="btn preset-filled-primary-500 px-6 py-3 rounded-lg font-semibold text-white shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all">
							Get Started
							<svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
						</a>
						<a href="https://github.com/mark-mcdermott/frunk" class="btn preset-outlined-surface-500 px-6 py-3 rounded-lg font-semibold hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors inline-flex items-center gap-2">
							<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
							Star on GitHub
						</a>
					</div>
				</div>

				<!-- Hero Illustration -->
				<div class="hidden lg:flex justify-center">
					<div class="relative">
						<div class="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-3xl blur-2xl opacity-20 animate-pulse"></div>
						<div class="relative bg-surface-100 dark:bg-surface-800 rounded-3xl p-4 shadow-2xl">
							<img src={illustration} alt="Illustration" class="w-[44rem] h-auto object-contain" />
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	
	<!-- Features Section -->
	<section id="features" class="py-20 px-4 sm:px-6 lg:px-8 bg-surface-100 dark:bg-surface-800/50">
		<div class="max-w-7xl mx-auto">
			<div class="text-center mb-16">
				<h2 class="text-3xl sm:text-4xl font-bold text-black dark:text-white mb-4">
					Why Frunk?
				</h2>
				<p class="text-lg text-surface-600 dark:text-surface-400 max-w-2xl mx-auto">
					Keep all your important car documents organized, secure, and accessible whenever you need them.
				</p>
			</div>

			<div class="grid md:grid-cols-3 gap-8">
				<div class="bg-white dark:bg-surface-800 rounded-2xl p-8 shadow-xl shadow-surface-900/5">
					<div class="flex items-center gap-4 mb-4">
						<div class="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
							<svg class="w-7 h-7 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/>
							</svg>
						</div>
						<h3 class="text-xl font-bold text-black dark:text-white">Secure Storage</h3>
					</div>
					<p class="text-surface-600 dark:text-surface-400">Your documents are encrypted and stored safely in the cloud, protected from loss or damage.</p>
				</div>

				<div class="bg-white dark:bg-surface-800 rounded-2xl p-8 shadow-xl shadow-surface-900/5">
					<div class="flex items-center gap-4 mb-4">
						<div class="w-12 h-12 rounded-xl bg-secondary-500/20 flex items-center justify-center">
							<svg class="w-7 h-7 text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"/>
							</svg>
						</div>
						<h3 class="text-xl font-bold text-black dark:text-white">Always Accessible</h3>
					</div>
					<p class="text-surface-600 dark:text-surface-400">Access your registration, insurance, and maintenance records from your phone, anytime, anywhere.</p>
				</div>

				<div class="bg-white dark:bg-surface-800 rounded-2xl p-8 shadow-xl shadow-surface-900/5">
					<div class="flex items-center gap-4 mb-4">
						<div class="w-12 h-12 rounded-xl bg-tertiary-500/20 flex items-center justify-center">
							<svg class="w-6 h-6 text-tertiary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
							</svg>
						</div>
						<h3 class="text-xl font-bold text-black dark:text-white">Stay Organized</h3>
					</div>
					<p class="text-surface-600 dark:text-surface-400">Never scramble to find paperwork again. Everything in one place, neatly categorized.</p>
				</div>
			</div>
		</div>
	</section>

	<!-- CTA Section -->
	<section class="py-20 px-4 sm:px-6 lg:px-8">
		<div class="max-w-4xl mx-auto text-center">
			<h2 class="text-3xl sm:text-4xl font-bold text-black dark:text-white mb-8">
				Get started now and let's get Frunk!
			</h2>
			<a href="/demo/lucia/signup" class="btn btn-lg preset-filled-primary-500">
				Sign Up
			</a>
		</div>
	</section>

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
