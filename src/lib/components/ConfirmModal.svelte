<script lang="ts">
	import { Portal } from '@skeletonlabs/skeleton-svelte';

	interface Props {
		open: boolean;
		title?: string;
		message: string;
		confirmText?: string;
		cancelText?: string;
		confirmClass?: string;
		onConfirm: () => void;
		onCancel: () => void;
	}

	let {
		open = false,
		title = 'Confirm',
		message,
		confirmText = 'Confirm',
		cancelText = 'Cancel',
		confirmClass = 'bg-red-500 hover:bg-red-600 text-white',
		onConfirm,
		onCancel
	}: Props = $props();

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onCancel();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onCancel();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<Portal>
		<div
			class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="confirm-title"
		>
			<!-- Backdrop -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="absolute inset-0 bg-black/50 backdrop-blur-sm"
				onclick={handleBackdropClick}
			></div>

			<!-- Modal -->
			<div class="relative bg-white dark:bg-surface-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-surface-200 dark:border-surface-700">
				<h3 id="confirm-title" class="text-lg font-semibold text-surface-900 dark:text-white mb-2">
					{title}
				</h3>
				<p class="text-sm text-surface-600 dark:text-surface-400 mb-6">
					{message}
				</p>
				<div class="flex gap-3 justify-end">
					<button
						type="button"
						class="px-4 py-2 rounded-lg text-sm font-medium bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-300 transition-colors"
						onclick={onCancel}
					>
						{cancelText}
					</button>
					<button
						type="button"
						class="px-4 py-2 rounded-lg text-sm font-medium {confirmClass} transition-colors"
						onclick={onConfirm}
					>
						{confirmText}
					</button>
				</div>
			</div>
		</div>
	</Portal>
{/if}
