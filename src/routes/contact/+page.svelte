<script lang="ts">
	import { enhance } from '$app/forms';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { Mail, MapPin, Github, CheckCircle } from 'lucide-svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let sending = $state(false);
</script>

<svelte:head>
	<title>Contact | Frunk</title>
</svelte:head>

<div class="min-h-screen flex flex-col bg-surface-50 dark:bg-surface-900">
	<Navbar />

	<main class="flex-1 py-12 px-4 sm:px-6 lg:px-8">
		<div class="max-w-3xl mx-auto">
			<div class="bg-white dark:bg-surface-800 rounded-2xl shadow-xl border border-[#eee] dark:border-surface-700 p-8">
				<h1 class="text-3xl font-bold text-black dark:text-white mb-4">Contact Us</h1>
				<p class="text-surface-600 dark:text-surface-400 mb-8">Have questions, feedback, or need support? We'd love to hear from you.</p>

				<div class="space-y-6">
					<div class="flex items-start gap-4">
						<div class="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
							<Mail class="w-6 h-6 text-primary-500" />
						</div>
						<div>
							<h3 class="font-semibold text-black dark:text-white">Email</h3>
							<p class="text-surface-600 dark:text-surface-400 mt-1">For general inquiries and support</p>
							<a href="mailto:hello@frunk.cloud" class="text-primary-500 hover:text-[#93c5fd] transition-colors">hello@frunk.cloud</a>
						</div>
					</div>

					<div class="flex items-start gap-4">
						<div class="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
							<Github class="w-6 h-6 text-primary-500" />
						</div>
						<div>
							<h3 class="font-semibold text-black dark:text-white">GitHub</h3>
							<p class="text-surface-600 dark:text-surface-400 mt-1">Report bugs or request features</p>
							<a href="https://github.com/mark-mcdermott/frunk/issues" class="text-primary-500 hover:text-[#93c5fd] transition-colors">github.com/mark-mcdermott/frunk</a>
						</div>
					</div>

					<div class="flex items-start gap-4">
						<div class="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
							<MapPin class="w-6 h-6 text-primary-500" />
						</div>
						<div>
							<h3 class="font-semibold text-black dark:text-white">Location</h3>
							<p class="text-surface-600 dark:text-surface-400 mt-1">Austin, Texas</p>
						</div>
					</div>
				</div>

				<div class="mt-10 pt-8 border-t border-surface-200 dark:border-surface-700">
					<h2 class="text-xl font-semibold text-black dark:text-white mb-4">Send us a message</h2>

					{#if form?.success}
						<div class="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-700 dark:text-green-400">
							<CheckCircle class="w-5 h-5 flex-shrink-0" />
							<p>Thanks for your message! We'll get back to you soon.</p>
						</div>
					{:else}
						<form
							method="POST"
							class="space-y-4"
							use:enhance={() => {
								sending = true;
								return async ({ update }) => {
									await update();
									sending = false;
								};
							}}
						>
							{#if form?.error}
								<div class="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 text-sm">
									{form.error}
								</div>
							{/if}

							<div>
								<label for="name" class="text-sm font-medium text-surface-600 dark:text-surface-400 block mb-1">Name</label>
								<input
									id="name"
									name="name"
									type="text"
									value={form?.name || ''}
									class="w-full px-4 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
									placeholder="Your name"
									required
								/>
							</div>
							<div>
								<label for="email" class="text-sm font-medium text-surface-600 dark:text-surface-400 block mb-1">Email</label>
								<input
									id="email"
									name="email"
									type="email"
									value={form?.email || ''}
									class="w-full px-4 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500"
									placeholder="you@example.com"
									required
								/>
							</div>
							<div>
								<label for="message" class="text-sm font-medium text-surface-600 dark:text-surface-400 block mb-1">Message</label>
								<textarea
									id="message"
									name="message"
									rows="4"
									class="w-full px-4 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500 resize-none"
									placeholder="How can we help?"
									required
								>{form?.message || ''}</textarea>
							</div>
							<button
								type="submit"
								class="btn preset-filled-primary-500 px-6 py-2.5 rounded-lg font-semibold text-white disabled:opacity-50"
								disabled={sending}
							>
								{sending ? 'Sending...' : 'Send Message'}
							</button>
						</form>
					{/if}
				</div>
			</div>
		</div>
	</main>

	<Footer />
</div>
