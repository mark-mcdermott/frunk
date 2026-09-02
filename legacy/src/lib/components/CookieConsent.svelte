<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';

	let showBanner = $state(false);
	const user = $derived($page.data.user);

	$effect(() => {
		if (browser) {
			checkConsent();
		}
	});

	async function checkConsent() {
		// First check localStorage
		const localConsent = localStorage.getItem('cookie-consent');

		if (user) {
			// If logged in, check database
			try {
				const response = await fetch('/api/cookie-consent');
				const data = await response.json();

				if (data.consent) {
					// User has consent in DB, sync to localStorage
					localStorage.setItem('cookie-consent', JSON.stringify(data.consent));
					showBanner = false;
					return;
				} else if (localConsent) {
					// User has local consent but not in DB, sync to DB
					const parsed = JSON.parse(localConsent);
					await saveConsent(parsed.essential, parsed.analytics, false);
					showBanner = false;
					return;
				}
			} catch (e) {
				console.error('Failed to check consent:', e);
			}
		}

		// Show banner if no consent found
		if (!localConsent) {
			showBanner = true;
		}
	}

	async function saveConsent(essential: boolean, analytics: boolean, updateLocal = true) {
		const consent = { essential, analytics, timestamp: Date.now() };

		if (updateLocal) {
			localStorage.setItem('cookie-consent', JSON.stringify(consent));
		}

		// If logged in, save to database
		if (user) {
			try {
				await fetch('/api/cookie-consent', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ essential, analytics })
				});
			} catch (e) {
				console.error('Failed to save consent:', e);
			}
		}
	}

	async function acceptAll() {
		await saveConsent(true, true);
		showBanner = false;
	}

	async function acceptEssential() {
		await saveConsent(true, false);
		showBanner = false;
	}
</script>

{#if showBanner}
	<div class="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white dark:bg-surface-800 border-t border-surface-200 dark:border-surface-700 shadow-lg">
		<div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
			<div class="flex-1 text-sm text-surface-600 dark:text-gray-300">
				<p>
					We use cookies to enhance your experience. Essential cookies are required for the site to function.
					Analytics cookies help us understand how you use the site.
					<a href="/privacy" class="text-primary-500 hover:text-[#93c5fd] underline">Learn more</a>
				</p>
			</div>
			<div class="flex items-center gap-3">
				<button
					type="button"
					class="px-4 py-2 text-sm font-medium text-surface-600 dark:text-gray-300 hover:text-surface-800 dark:hover:text-surface-200 transition-colors"
					onclick={acceptEssential}
				>
					Essential Only
				</button>
				<button
					type="button"
					class="btn px-4 py-2 text-sm font-medium bg-primary-500 text-white rounded-lg transition-colors"
					onclick={acceptAll}
				>
					Accept All
				</button>
			</div>
		</div>
	</div>
{/if}
