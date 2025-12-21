<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { Car, Wrench, FileText, Camera } from 'lucide-svelte';
</script>

<svelte:head>
	<title>About | Frunk</title>
</svelte:head>

<div class="min-h-screen flex flex-col bg-surface-50 dark:bg-surface-900">
	<Navbar />

	<main class="flex-1 py-12 px-4 sm:px-6 lg:px-8">
		<div class="max-w-4xl mx-auto">
			<!-- Hero Section -->
			<div class="text-center mb-12">
				<h1 class="text-4xl font-bold text-black dark:text-white mb-4">About Frunk</h1>
				<p class="text-xl text-surface-600 dark:text-surface-400 max-w-2xl mx-auto">
					Your personal vehicle management companion. Keep track of everything about your cars in one place.
				</p>
			</div>

			<!-- What is Frunk -->
			<div class="bg-white dark:bg-surface-800 rounded-2xl shadow-xl border border-[#eee] dark:border-surface-700 p-8 mb-8">
				<h2 class="text-2xl font-bold text-black dark:text-white mb-4">What is Frunk?</h2>
				<p class="text-surface-600 dark:text-surface-400 mb-4">
					Frunk is a modern vehicle management application designed for car enthusiasts and everyday drivers alike.
					Whether you own one car or a whole collection, Frunk helps you stay organized and on top of maintenance.
				</p>
				<p class="text-surface-600 dark:text-surface-400">
					The name "Frunk" comes from "front trunk" - the storage compartment found in electric vehicles and some sports cars.
					Just like a frunk stores your essentials, our app stores everything important about your vehicles.
				</p>
			</div>

			<!-- Features -->
			<div class="bg-white dark:bg-surface-800 rounded-2xl shadow-xl border border-[#eee] dark:border-surface-700 p-8 mb-8">
				<h2 class="text-2xl font-bold text-black dark:text-white mb-6">Features</h2>
				<div class="grid md:grid-cols-2 gap-6">
					<div class="flex gap-4">
						<div class="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg h-fit">
							<Car class="w-6 h-6 text-primary-500" />
						</div>
						<div>
							<h3 class="font-semibold text-black dark:text-white mb-1">Vehicle Profiles</h3>
							<p class="text-sm text-surface-600 dark:text-surface-400">Store details about all your vehicles including make, model, year, VIN, and photos.</p>
						</div>
					</div>

					<div class="flex gap-4">
						<div class="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg h-fit">
							<Wrench class="w-6 h-6 text-primary-500" />
						</div>
						<div>
							<h3 class="font-semibold text-black dark:text-white mb-1">Repair Tracking</h3>
							<p class="text-sm text-surface-600 dark:text-surface-400">Log maintenance and repairs with dates, costs, mileage, and vendor information.</p>
						</div>
					</div>

					<div class="flex gap-4">
						<div class="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg h-fit">
							<FileText class="w-6 h-6 text-primary-500" />
						</div>
						<div>
							<h3 class="font-semibold text-black dark:text-white mb-1">Notes & Documents</h3>
							<p class="text-sm text-surface-600 dark:text-surface-400">Attach notes and documents to vehicles, repairs, or vendors for easy reference.</p>
						</div>
					</div>

					<div class="flex gap-4">
						<div class="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg h-fit">
							<Camera class="w-6 h-6 text-primary-500" />
						</div>
						<div>
							<h3 class="font-semibold text-black dark:text-white mb-1">Photo Galleries</h3>
							<p class="text-sm text-surface-600 dark:text-surface-400">Create galleries to showcase your vehicles with organized photo collections.</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Tech Stack -->
			<div class="bg-white dark:bg-surface-800 rounded-2xl shadow-xl border border-[#eee] dark:border-surface-700 p-8 mb-8">
				<h2 class="text-2xl font-bold text-black dark:text-white mb-4">Built With</h2>
				<p class="text-surface-600 dark:text-surface-400 mb-4">
					Frunk is built with modern, reliable technologies:
				</p>
				<div class="flex flex-wrap gap-2">
					<span class="px-3 py-1 bg-surface-100 dark:bg-surface-700 rounded-full text-sm text-surface-600 dark:text-surface-400">SvelteKit</span>
					<span class="px-3 py-1 bg-surface-100 dark:bg-surface-700 rounded-full text-sm text-surface-600 dark:text-surface-400">Svelte 5</span>
					<span class="px-3 py-1 bg-surface-100 dark:bg-surface-700 rounded-full text-sm text-surface-600 dark:text-surface-400">TypeScript</span>
					<span class="px-3 py-1 bg-surface-100 dark:bg-surface-700 rounded-full text-sm text-surface-600 dark:text-surface-400">Tailwind CSS</span>
					<span class="px-3 py-1 bg-surface-100 dark:bg-surface-700 rounded-full text-sm text-surface-600 dark:text-surface-400">Drizzle ORM</span>
					<span class="px-3 py-1 bg-surface-100 dark:bg-surface-700 rounded-full text-sm text-surface-600 dark:text-surface-400">Neon PostgreSQL</span>
					<span class="px-3 py-1 bg-surface-100 dark:bg-surface-700 rounded-full text-sm text-surface-600 dark:text-surface-400">Cloudflare</span>
				</div>
				<p class="text-surface-600 dark:text-surface-400 mt-4">
					The project is open source and available on <a href="https://github.com/mark-mcdermott/frunk" class="text-primary-500 hover:text-[#93c5fd] transition-colors">GitHub</a>.
				</p>
			</div>

			<!-- The Frunk Story -->
			<div class="bg-white dark:bg-surface-800 rounded-2xl shadow-xl border border-[#eee] dark:border-surface-700 p-8 mb-8">
				<h2 class="text-2xl font-bold text-black dark:text-white mb-4">The Frunk Story</h2>
				<p class="text-surface-600 dark:text-surface-400 mb-4">
					This app has been a dream of mine for a few years now. It started as sort of fake app project just for me to work on my webdev skills. After a while I realized it was actually a decent idea and decided to try to build it for real.
				</p>
				<p class="text-surface-600 dark:text-surface-400 mb-4">
					For whatever reason, over the years I would build this app until it was about 75% done, then put it down for about 9 months and not touch it. Then I would decide to build it in a different framework and would get it to 75% done and the cycle would repeat. But recently when I realized how powerful Claude Code was, I decided to finish it for real.
				</p>
			</div>

			<!-- Roadmap -->
			<div class="bg-white dark:bg-surface-800 rounded-2xl shadow-xl border border-[#eee] dark:border-surface-700 p-8">
				<h2 class="text-2xl font-bold text-black dark:text-white mb-4">Roadmap</h2>
				<p class="text-surface-600 dark:text-surface-400 mb-4">
					Nothing is set in stone here, but here are my loose goals for this app, in this order:
				</p>
				<ul class="list-disc list-inside text-surface-600 dark:text-surface-400 space-y-2">
					<li>Small logo tweak</li>
					<li>Get the merch store running</li>
					<li>Scheduled maintenance feature (probably for pay-tier only, likely a flat one-time $5)</li>
					<li>Maybe add more pay-tier features</li>
					<li>Get iOS and Android mobile apps running and in the app stores and get Mac/Windows/Linux desktop apps running</li>
				</ul>
			</div>
		</div>
	</main>

	<Footer />
</div>
