<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
</script>

<svelte:head>
	<title>Privacy Policy | Frunk</title>
</svelte:head>

<div class="min-h-screen flex flex-col bg-surface-50 dark:bg-surface-900">
	<Navbar />

	<main class="flex-1 py-12 px-4 sm:px-6 lg:px-8">
		<div class="max-w-3xl mx-auto">
			<div class="bg-white dark:bg-surface-800 rounded-2xl shadow-xl border border-[#eee] dark:border-surface-700 p-8">
				<h1 class="text-3xl font-bold text-black dark:text-white mb-8">Privacy Policy</h1>

				<div class="prose dark:prose-invert max-w-none space-y-6 text-surface-700 dark:text-surface-300">
					<p class="text-sm text-surface-500">Last updated: December 2025</p>

					<section>
						<h2 class="text-xl font-semibold text-black dark:text-white mt-8 mb-4">1. Information We Collect</h2>
						<p>We collect information you provide directly to us, including:</p>
						<ul class="list-disc pl-6 mt-2 space-y-1">
							<li><strong>Account Information:</strong> When you create an account, we collect your username, email address, and password (stored securely as a hash).</li>
							<li><strong>Vehicle Data:</strong> Information about your vehicles including make, model, year, VIN, and related photos and documents.</li>
							<li><strong>Usage Data:</strong> Information about how you use the application, including repairs, notes, and vendor information you add.</li>
						</ul>
					</section>

					<section>
						<h2 class="text-xl font-semibold text-black dark:text-white mt-8 mb-4">2. How We Use Your Information</h2>
						<p>We use the information we collect to:</p>
						<ul class="list-disc pl-6 mt-2 space-y-1">
							<li>Provide, maintain, and improve our services</li>
							<li>Process transactions and send related information</li>
							<li>Send you technical notices and support messages</li>
							<li>Respond to your comments, questions, and requests</li>
						</ul>
					</section>

					<section>
						<h2 class="text-xl font-semibold text-black dark:text-white mt-8 mb-4">3. Cookies</h2>
						<p>We use the following types of cookies:</p>
						<ul class="list-disc pl-6 mt-2 space-y-1">
							<li><strong>Essential Cookies:</strong> Required for the site to function properly, including session cookies for authentication. These cannot be disabled.</li>
							<li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our website. You can opt out of these cookies.</li>
						</ul>
						<p class="mt-4">You can manage your cookie preferences at any time. Essential cookies are necessary for the website to function and cannot be switched off.</p>
					</section>

					<section>
						<h2 class="text-xl font-semibold text-black dark:text-white mt-8 mb-4">4. Data Storage and Security</h2>
						<p>Your data is stored securely using industry-standard encryption. We use:</p>
						<ul class="list-disc pl-6 mt-2 space-y-1">
							<li>HTTPS encryption for all data transmission</li>
							<li>Secure password hashing (never stored in plain text)</li>
							<li>Cloud storage with encryption at rest for uploaded files</li>
						</ul>
					</section>

					<section>
						<h2 class="text-xl font-semibold text-black dark:text-white mt-8 mb-4">5. Your Rights</h2>
						<p>You have the right to:</p>
						<ul class="list-disc pl-6 mt-2 space-y-1">
							<li><strong>Access:</strong> Request a copy of your personal data</li>
							<li><strong>Correction:</strong> Update or correct your personal data</li>
							<li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
							<li><strong>Export:</strong> Request your data in a portable format</li>
						</ul>
						<p class="mt-4">To exercise any of these rights, please contact us or use the account settings in your profile.</p>
					</section>

					<section>
						<h2 class="text-xl font-semibold text-black dark:text-white mt-8 mb-4">6. Data Retention</h2>
						<p>We retain your personal data for as long as your account is active. When you delete your account, we will delete your personal data within 30 days, except where we are required to retain it for legal purposes.</p>
					</section>

					<section>
						<h2 class="text-xl font-semibold text-black dark:text-white mt-8 mb-4">7. Third-Party Services</h2>
						<p>We may use third-party services that collect, monitor, and analyze data to improve our service. These include:</p>
						<ul class="list-disc pl-6 mt-2 space-y-1">
							<li>Analytics providers (when analytics cookies are accepted)</li>
							<li>Cloud storage providers for file hosting</li>
							<li>Payment processors for merchandise orders</li>
						</ul>
					</section>

					<section>
						<h2 class="text-xl font-semibold text-black dark:text-white mt-8 mb-4">8. Changes to This Policy</h2>
						<p>We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.</p>
					</section>

					<section>
						<h2 class="text-xl font-semibold text-black dark:text-white mt-8 mb-4">9. Contact Us</h2>
						<p>If you have any questions about this Privacy Policy, please contact us at:</p>
						<p class="mt-2"><a href="mailto:privacy@frunk.app" class="text-primary-500 hover:text-[#93c5fd]">privacy@frunk.app</a></p>
					</section>
				</div>
			</div>
		</div>
	</main>

	<Footer />
</div>
