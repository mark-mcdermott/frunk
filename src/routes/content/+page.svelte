<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';

	let activeSection = $state('introduction');

	const tableOfContents = [
		{ id: 'introduction', title: 'Introduction' },
		{ id: 'getting-started', title: 'Getting Started' },
		{ id: 'core-concepts', title: 'Core Concepts' },
		{ id: 'best-practices', title: 'Best Practices' },
		{ id: 'advanced-usage', title: 'Advanced Usage' },
		{ id: 'conclusion', title: 'Conclusion' }
	];
</script>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900">
	<Navbar />

	<!-- Breadcrumbs -->
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
		<Breadcrumbs items={[{ label: 'Content' }]} />
	</div>

	<!-- Content Layout -->
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
		<div class="lg:grid lg:grid-cols-[220px_1fr] lg:gap-12 xl:grid-cols-[240px_1fr] xl:gap-16">

			<!-- Sidebar / Table of Contents -->
			<aside class="hidden lg:block">
				<div class="sticky top-24">
					<h4 class="text-sm font-semibold text-surface-900 dark:text-white mb-4">On this page</h4>
					<nav class="space-y-1">
						{#each tableOfContents as item}
							<a
								href="#{item.id}"
								class="block py-1.5 text-sm transition-colors {activeSection === item.id ? 'text-primary-500 font-medium' : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'}"
								onclick={() => activeSection = item.id}
							>
								{item.title}
							</a>
						{/each}
					</nav>

					<div class="mt-8 pt-8 border-t border-surface-200 dark:border-surface-800">
						<a href="#" class="text-sm text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 flex items-center gap-2">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
							</svg>
							Edit this page
						</a>
					</div>
				</div>
			</aside>

			<!-- Main Content -->
			<main class="min-w-0">
				<!-- Article Header -->
				<header class="mb-10">
					<div class="flex items-center gap-2 text-sm text-surface-500 mb-4">
						<a href="/" class="hover:text-primary-500">Docs</a>
						<span>/</span>
						<a href="/content" class="hover:text-primary-500">Guide</a>
						<span>/</span>
						<span class="text-surface-700 dark:text-surface-300">Getting Started</span>
					</div>
					<h1 class="text-4xl font-bold text-surface-900 dark:text-white mb-4">
						Building Modern Interfaces
					</h1>
					<p class="text-xl text-surface-600 dark:text-surface-400 leading-relaxed">
						A comprehensive guide to creating beautiful, accessible, and performant user interfaces with modern tooling.
					</p>
					<div class="flex items-center gap-4 mt-6 text-sm text-surface-500">
						<span>Last updated: Dec 15, 2025</span>
						<span class="w-1 h-1 rounded-full bg-surface-300"></span>
						<span>12 min read</span>
					</div>
				</header>

				<!-- Article Body -->
				<article class="prose prose-surface dark:prose-invert max-w-none">

					<section id="introduction" class="scroll-mt-24">
						<h2 class="text-2xl font-bold text-surface-900 dark:text-white mb-4 pb-2 border-b border-surface-200 dark:border-surface-800">
							Introduction
						</h2>
						<p class="text-surface-700 dark:text-surface-300 leading-relaxed mb-4">
							Modern web development has evolved significantly over the past decade. What once required complex JavaScript frameworks and extensive boilerplate can now be achieved with lightweight, reactive tools that prioritize developer experience without sacrificing performance.
						</p>
						<p class="text-surface-700 dark:text-surface-300 leading-relaxed mb-4">
							This guide walks you through the fundamental concepts and practical techniques for building interfaces that users love. We'll cover everything from initial setup to advanced patterns, with real-world examples you can apply to your own projects.
						</p>
						<div class="bg-primary-500/10 border border-primary-500/20 rounded-lg p-4 my-6">
							<div class="flex gap-3">
								<svg class="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
								</svg>
								<div>
									<p class="font-medium text-primary-700 dark:text-primary-300 mb-1">Note</p>
									<p class="text-sm text-primary-600 dark:text-primary-400">This guide assumes basic familiarity with HTML, CSS, and JavaScript. If you're new to web development, consider starting with our beginner tutorials first.</p>
								</div>
							</div>
						</div>
					</section>

					<section id="getting-started" class="scroll-mt-24 mt-12">
						<h2 class="text-2xl font-bold text-surface-900 dark:text-white mb-4 pb-2 border-b border-surface-200 dark:border-surface-800">
							Getting Started
						</h2>
						<p class="text-surface-700 dark:text-surface-300 leading-relaxed mb-4">
							Before diving into code, let's ensure your development environment is properly configured. You'll need Node.js (version 18 or higher) and a package manager like npm or pnpm installed on your system.
						</p>

						<h3 class="text-xl font-semibold text-surface-900 dark:text-white mt-8 mb-3">Installation</h3>
						<p class="text-surface-700 dark:text-surface-300 leading-relaxed mb-4">
							The quickest way to get started is using our CLI tool. Open your terminal and run the following command:
						</p>

						<!-- Code Block -->
						<div class="relative my-6">
							<div class="flex items-center justify-between bg-surface-800 dark:bg-surface-950 px-4 py-2 rounded-t-lg border-b border-surface-700">
								<span class="text-sm text-surface-400">Terminal</span>
								<button class="text-sm text-surface-400 hover:text-white transition-colors" aria-label="Copy code">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
									</svg>
								</button>
							</div>
							<pre class="bg-surface-900 dark:bg-surface-950 p-4 rounded-b-lg overflow-x-auto"><code class="text-sm text-surface-300">npx create-skeleton-app my-project
cd my-project
npm install
npm run dev</code></pre>
						</div>

						<p class="text-surface-700 dark:text-surface-300 leading-relaxed mb-4">
							This will scaffold a new project with all the necessary dependencies and configuration files. Once complete, you'll have a development server running at <code class="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-800 rounded text-sm font-mono text-primary-600 dark:text-primary-400">localhost:5173</code>.
						</p>

						<h3 class="text-xl font-semibold text-surface-900 dark:text-white mt-8 mb-3">Project Structure</h3>
						<p class="text-surface-700 dark:text-surface-300 leading-relaxed mb-4">
							The generated project follows a standard structure that scales well from small prototypes to large applications:
						</p>

						<ul class="space-y-2 my-4">
							<li class="flex items-start gap-2 text-surface-700 dark:text-surface-300">
								<span class="text-primary-500 mt-1">
									<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z" clip-rule="evenodd"/><path d="M6 12a2 2 0 012-2h8a2 2 0 012 2v2a2 2 0 01-2 2H2h2a2 2 0 002-2v-2z"/></svg>
								</span>
								<span><code class="font-mono text-sm">src/routes/</code> — Page components and routing</span>
							</li>
							<li class="flex items-start gap-2 text-surface-700 dark:text-surface-300">
								<span class="text-primary-500 mt-1">
									<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z" clip-rule="evenodd"/><path d="M6 12a2 2 0 012-2h8a2 2 0 012 2v2a2 2 0 01-2 2H2h2a2 2 0 002-2v-2z"/></svg>
								</span>
								<span><code class="font-mono text-sm">src/lib/</code> — Shared components and utilities</span>
							</li>
							<li class="flex items-start gap-2 text-surface-700 dark:text-surface-300">
								<span class="text-primary-500 mt-1">
									<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z" clip-rule="evenodd"/><path d="M6 12a2 2 0 012-2h8a2 2 0 012 2v2a2 2 0 01-2 2H2h2a2 2 0 002-2v-2z"/></svg>
								</span>
								<span><code class="font-mono text-sm">static/</code> — Static assets like images and fonts</span>
							</li>
						</ul>
					</section>

					<section id="core-concepts" class="scroll-mt-24 mt-12">
						<h2 class="text-2xl font-bold text-surface-900 dark:text-white mb-4 pb-2 border-b border-surface-200 dark:border-surface-800">
							Core Concepts
						</h2>
						<p class="text-surface-700 dark:text-surface-300 leading-relaxed mb-4">
							Understanding a few key concepts will help you make the most of the framework. These patterns appear throughout the codebase and form the foundation of how components communicate and share state.
						</p>

						<h3 class="text-xl font-semibold text-surface-900 dark:text-white mt-8 mb-3">Reactivity</h3>
						<p class="text-surface-700 dark:text-surface-300 leading-relaxed mb-4">
							At its core, the framework uses a reactive programming model. When data changes, the UI automatically updates to reflect those changes. This eliminates the need for manual DOM manipulation and reduces the likelihood of bugs caused by stale state.
						</p>

						<div class="relative my-6">
							<div class="flex items-center justify-between bg-surface-800 dark:bg-surface-950 px-4 py-2 rounded-t-lg border-b border-surface-700">
								<span class="text-sm text-surface-400">Svelte</span>
								<button class="text-sm text-surface-400 hover:text-white transition-colors" aria-label="Copy code">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
									</svg>
								</button>
							</div>
							<pre class="bg-surface-900 dark:bg-surface-950 p-4 rounded-b-lg overflow-x-auto"><code class="text-sm text-surface-300"><span class="text-pink-400">let</span> count = <span class="text-amber-400">$state</span>(<span class="text-cyan-400">0</span>);

<span class="text-pink-400">function</span> <span class="text-blue-400">increment</span>() &#123;
  count++;
&#125;</code></pre>
						</div>

						<h3 class="text-xl font-semibold text-surface-900 dark:text-white mt-8 mb-3">Component Composition</h3>
						<p class="text-surface-700 dark:text-surface-300 leading-relaxed mb-4">
							Complex interfaces are built by composing smaller, reusable components. Each component encapsulates its own markup, styles, and behavior, making it easy to reason about and test in isolation.
						</p>

						<!-- Table Example -->
						<div class="my-6 overflow-x-auto">
							<table class="w-full text-sm">
								<thead>
									<tr class="border-b border-surface-200 dark:border-surface-700">
										<th class="text-left py-3 pr-4 font-semibold text-surface-900 dark:text-white">Pattern</th>
										<th class="text-left py-3 pr-4 font-semibold text-surface-900 dark:text-white">Use Case</th>
										<th class="text-left py-3 font-semibold text-surface-900 dark:text-white">Complexity</th>
									</tr>
								</thead>
								<tbody class="text-surface-700 dark:text-surface-300">
									<tr class="border-b border-surface-100 dark:border-surface-800">
										<td class="py-3 pr-4">Props</td>
										<td class="py-3 pr-4">Parent to child communication</td>
										<td class="py-3"><span class="px-2 py-1 text-xs font-medium rounded-full bg-success-500/20 text-success-600">Low</span></td>
									</tr>
									<tr class="border-b border-surface-100 dark:border-surface-800">
										<td class="py-3 pr-4">Events</td>
										<td class="py-3 pr-4">Child to parent communication</td>
										<td class="py-3"><span class="px-2 py-1 text-xs font-medium rounded-full bg-success-500/20 text-success-600">Low</span></td>
									</tr>
									<tr class="border-b border-surface-100 dark:border-surface-800">
										<td class="py-3 pr-4">Context</td>
										<td class="py-3 pr-4">Deeply nested components</td>
										<td class="py-3"><span class="px-2 py-1 text-xs font-medium rounded-full bg-warning-500/20 text-warning-600">Medium</span></td>
									</tr>
									<tr>
										<td class="py-3 pr-4">Stores</td>
										<td class="py-3 pr-4">Global state management</td>
										<td class="py-3"><span class="px-2 py-1 text-xs font-medium rounded-full bg-warning-500/20 text-warning-600">Medium</span></td>
									</tr>
								</tbody>
							</table>
						</div>
					</section>

					<section id="best-practices" class="scroll-mt-24 mt-12">
						<h2 class="text-2xl font-bold text-surface-900 dark:text-white mb-4 pb-2 border-b border-surface-200 dark:border-surface-800">
							Best Practices
						</h2>
						<p class="text-surface-700 dark:text-surface-300 leading-relaxed mb-4">
							Following established patterns helps maintain code quality and makes it easier for teams to collaborate effectively. Here are the practices we recommend:
						</p>

						<div class="space-y-4 my-6">
							<div class="flex gap-4 p-4 bg-surface-100 dark:bg-surface-800 rounded-lg">
								<div class="flex-shrink-0 w-8 h-8 rounded-full bg-success-500/20 flex items-center justify-center">
									<svg class="w-4 h-4 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
									</svg>
								</div>
								<div>
									<h4 class="font-semibold text-surface-900 dark:text-white mb-1">Keep components focused</h4>
									<p class="text-sm text-surface-600 dark:text-surface-400">Each component should do one thing well. If a component grows too large, consider splitting it into smaller pieces.</p>
								</div>
							</div>

							<div class="flex gap-4 p-4 bg-surface-100 dark:bg-surface-800 rounded-lg">
								<div class="flex-shrink-0 w-8 h-8 rounded-full bg-success-500/20 flex items-center justify-center">
									<svg class="w-4 h-4 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
									</svg>
								</div>
								<div>
									<h4 class="font-semibold text-surface-900 dark:text-white mb-1">Use semantic HTML</h4>
									<p class="text-sm text-surface-600 dark:text-surface-400">Proper HTML elements improve accessibility and SEO. Use buttons for actions, links for navigation, and headings for structure.</p>
								</div>
							</div>

							<div class="flex gap-4 p-4 bg-surface-100 dark:bg-surface-800 rounded-lg">
								<div class="flex-shrink-0 w-8 h-8 rounded-full bg-success-500/20 flex items-center justify-center">
									<svg class="w-4 h-4 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
									</svg>
								</div>
								<div>
									<h4 class="font-semibold text-surface-900 dark:text-white mb-1">Test critical paths</h4>
									<p class="text-sm text-surface-600 dark:text-surface-400">Focus testing efforts on user-facing functionality. Unit tests for utilities, integration tests for features.</p>
								</div>
							</div>
						</div>

						<div class="bg-warning-500/10 border border-warning-500/20 rounded-lg p-4 my-6">
							<div class="flex gap-3">
								<svg class="w-5 h-5 text-warning-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
								</svg>
								<div>
									<p class="font-medium text-warning-700 dark:text-warning-300 mb-1">Warning</p>
									<p class="text-sm text-warning-600 dark:text-warning-400">Avoid premature optimization. Profile your application first to identify actual bottlenecks before making performance-related changes.</p>
								</div>
							</div>
						</div>
					</section>

					<section id="advanced-usage" class="scroll-mt-24 mt-12">
						<h2 class="text-2xl font-bold text-surface-900 dark:text-white mb-4 pb-2 border-b border-surface-200 dark:border-surface-800">
							Advanced Usage
						</h2>
						<p class="text-surface-700 dark:text-surface-300 leading-relaxed mb-4">
							Once you're comfortable with the basics, these advanced techniques can help you build more sophisticated applications.
						</p>

						<h3 class="text-xl font-semibold text-surface-900 dark:text-white mt-8 mb-3">Server-Side Rendering</h3>
						<p class="text-surface-700 dark:text-surface-300 leading-relaxed mb-4">
							SSR improves initial page load times and is essential for SEO. The framework handles most of the complexity automatically, but there are a few things to keep in mind when writing components that run on both server and client.
						</p>

						<blockquote class="border-l-4 border-primary-500 pl-4 my-6 italic text-surface-600 dark:text-surface-400">
							"The best code is no code at all. Every line of code is a liability—it has to be maintained, debugged, and understood by future developers."
							<footer class="mt-2 text-sm not-italic text-surface-500">— A wise engineer</footer>
						</blockquote>

						<h3 class="text-xl font-semibold text-surface-900 dark:text-white mt-8 mb-3">Performance Optimization</h3>
						<p class="text-surface-700 dark:text-surface-300 leading-relaxed mb-4">
							While the framework is fast by default, large applications may benefit from additional optimization. Key strategies include code splitting, lazy loading images, and minimizing reactive dependencies.
						</p>
					</section>

					<section id="conclusion" class="scroll-mt-24 mt-12">
						<h2 class="text-2xl font-bold text-surface-900 dark:text-white mb-4 pb-2 border-b border-surface-200 dark:border-surface-800">
							Conclusion
						</h2>
						<p class="text-surface-700 dark:text-surface-300 leading-relaxed mb-4">
							You now have a solid foundation for building modern interfaces. The patterns and practices covered in this guide will serve you well as you tackle increasingly complex projects.
						</p>
						<p class="text-surface-700 dark:text-surface-300 leading-relaxed mb-4">
							Remember that learning is iterative. Don't try to master everything at once—start with the basics, build something real, and gradually incorporate more advanced techniques as you encounter the need for them.
						</p>
					</section>
				</article>

				<!-- Article Footer -->
				<footer class="mt-16 pt-8 border-t border-surface-200 dark:border-surface-800">
					<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div class="flex items-center gap-3">
							<div class="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-500 font-bold">
								SC
							</div>
							<div>
								<p class="font-medium text-surface-900 dark:text-white">Sarah Chen</p>
								<p class="text-sm text-surface-500">Technical Writer</p>
							</div>
						</div>
						<div class="flex items-center gap-2">
							<span class="text-sm text-surface-500">Was this helpful?</span>
							<button class="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors" aria-label="Yes">
								<svg class="w-5 h-5 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/>
								</svg>
							</button>
							<button class="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors" aria-label="No">
								<svg class="w-5 h-5 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"/>
								</svg>
							</button>
						</div>
					</div>

					<!-- Navigation between articles -->
					<div class="grid sm:grid-cols-2 gap-4 mt-8">
						<a href="#" class="group p-4 rounded-lg border border-surface-200 dark:border-surface-700 hover:border-primary-500 dark:hover:border-primary-500 transition-colors">
							<span class="text-sm text-surface-500 flex items-center gap-1">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
								</svg>
								Previous
							</span>
							<span class="font-medium text-surface-900 dark:text-white group-hover:text-primary-500 transition-colors">Installation Guide</span>
						</a>
						<a href="#" class="group p-4 rounded-lg border border-surface-200 dark:border-surface-700 hover:border-primary-500 dark:hover:border-primary-500 transition-colors text-right">
							<span class="text-sm text-surface-500 flex items-center justify-end gap-1">
								Next
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
								</svg>
							</span>
							<span class="font-medium text-surface-900 dark:text-white group-hover:text-primary-500 transition-colors">Component Library</span>
						</a>
					</div>
				</footer>
			</main>
		</div>
	</div>

	<Footer />
</div>
