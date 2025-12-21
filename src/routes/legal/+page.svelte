<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
</script>

<svelte:head>
	<title>Terms of Service | Frunk</title>
</svelte:head>

<div class="min-h-screen flex flex-col bg-surface-50 dark:bg-surface-900">
	<Navbar />

	<main class="flex-1 py-12 px-4 sm:px-6 lg:px-8">
		<div class="max-w-3xl mx-auto">
			<div class="bg-white dark:bg-surface-800 rounded-2xl shadow-xl border border-[#eee] dark:border-surface-700 p-8">
				<h1 class="text-3xl font-bold text-black dark:text-white mb-8">Terms of Service</h1>

				<div class="prose dark:prose-invert max-w-none space-y-6 text-surface-700 dark:text-surface-300">
					<p class="text-sm text-surface-500">Last updated: December 2025</p>

					<section>
						<h2 class="text-xl font-semibold text-black dark:text-white mt-8 mb-4">1. Acceptance of Terms</h2>
						<p>By accessing and using Frunk ("the Service"), you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these terms, please do not use the Service.</p>
					</section>

					<section>
						<h2 class="text-xl font-semibold text-black dark:text-white mt-8 mb-4">2. Description of Service</h2>
						<p>Frunk is a vehicle management application that allows users to:</p>
						<ul class="list-disc pl-6 mt-2 space-y-1">
							<li>Track and manage vehicle information</li>
							<li>Record maintenance and repair history</li>
							<li>Store vehicle-related documents and photos</li>
							<li>Manage vendor relationships</li>
						</ul>
					</section>

					<section>
						<h2 class="text-xl font-semibold text-black dark:text-white mt-8 mb-4">3. User Accounts</h2>
						<p>To use certain features of the Service, you must register for an account. You agree to:</p>
						<ul class="list-disc pl-6 mt-2 space-y-1">
							<li>Provide accurate and complete information</li>
							<li>Maintain the security of your password</li>
							<li>Accept responsibility for all activities under your account</li>
							<li>Notify us immediately of any unauthorized use</li>
						</ul>
					</section>

					<section>
						<h2 class="text-xl font-semibold text-black dark:text-white mt-8 mb-4">4. User Content</h2>
						<p>You retain ownership of content you upload to the Service. By uploading content, you grant us a license to store, display, and process that content as necessary to provide the Service.</p>
						<p class="mt-4">You are responsible for ensuring you have the right to upload any content and that it does not violate any laws or third-party rights.</p>
					</section>

					<section>
						<h2 class="text-xl font-semibold text-black dark:text-white mt-8 mb-4">5. Prohibited Uses</h2>
						<p>You agree not to:</p>
						<ul class="list-disc pl-6 mt-2 space-y-1">
							<li>Use the Service for any illegal purpose</li>
							<li>Upload malicious code or attempt to compromise the Service</li>
							<li>Interfere with other users' access to the Service</li>
							<li>Attempt to gain unauthorized access to any part of the Service</li>
							<li>Use the Service to store or transmit infringing or harmful content</li>
						</ul>
					</section>

					<section>
						<h2 class="text-xl font-semibold text-black dark:text-white mt-8 mb-4">6. Disclaimer of Warranties</h2>
						<p>The Service is provided "as is" without warranties of any kind, either express or implied. We do not warrant that the Service will be uninterrupted, secure, or error-free.</p>
					</section>

					<section>
						<h2 class="text-xl font-semibold text-black dark:text-white mt-8 mb-4">7. Limitation of Liability</h2>
						<p>To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.</p>
					</section>

					<section>
						<h2 class="text-xl font-semibold text-black dark:text-white mt-8 mb-4">8. Termination</h2>
						<p>We reserve the right to terminate or suspend your account at any time for violations of these terms. You may also delete your account at any time through your account settings.</p>
					</section>

					<section>
						<h2 class="text-xl font-semibold text-black dark:text-white mt-8 mb-4">9. Changes to Terms</h2>
						<p>We may modify these terms at any time. We will notify users of significant changes. Continued use of the Service after changes constitutes acceptance of the new terms.</p>
					</section>

					<section>
						<h2 class="text-xl font-semibold text-black dark:text-white mt-8 mb-4">10. Contact</h2>
						<p>For questions about these terms, please contact us at:</p>
						<p class="mt-2"><a href="mailto:hello@frunk.cloud" class="text-primary-500 hover:text-[#93c5fd]">hello@frunk.cloud</a></p>
					</section>
				</div>
			</div>
		</div>
	</main>

	<Footer />
</div>
