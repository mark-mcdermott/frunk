<script lang="ts" module>
	export type ThemeMode = 'light' | 'dark' | 'system';
	export type ToggleMode = 'light-dark' | 'light-dark-system';
</script>

<script lang="ts">
	import { cn } from '$lib/utils';
	import { Sun, Moon, Monitor } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		mode?: ToggleMode;
		class?: string;
	}

	let { mode = 'light-dark-system', class: className, ...restProps }: Props = $props();

	let theme = $state<ThemeMode>('light');
	let mounted = $state(false);

	const STORAGE_KEY = 'theme';

	function getSystemTheme(): 'light' | 'dark' {
		if (typeof window === 'undefined') return 'light';
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}

	function applyTheme(t: ThemeMode) {
		if (typeof document === 'undefined') return;

		const effectiveTheme = t === 'system' ? getSystemTheme() : t;

		if (effectiveTheme === 'dark') {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	}

	function cycleTheme() {
		if (mode === 'light-dark') {
			theme = theme === 'light' ? 'dark' : 'light';
		} else {
			// light -> dark -> system -> light
			if (theme === 'light') theme = 'dark';
			else if (theme === 'dark') theme = 'system';
			else theme = 'light';
		}

		localStorage.setItem(STORAGE_KEY, theme);
		applyTheme(theme);
	}

	onMount(() => {
		// Get stored theme or default to system (for 3-state) or light (for 2-state)
		const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;

		if (stored) {
			if (mode === 'light-dark' && stored === 'system') {
				// 2-state toggle: resolve 'system' to actual preference
				theme = getSystemTheme();
			} else if (mode === 'light-dark-system' || stored !== 'system') {
				theme = stored;
			} else {
				theme = 'light';
			}
		} else if (mode === 'light-dark-system') {
			theme = 'system';
		} else {
			// 2-state toggle with no stored value: respect system preference
			theme = getSystemTheme();
		}

		applyTheme(theme);
		mounted = true;

		// Listen for system theme changes
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleChange = () => {
			if (theme === 'system') {
				applyTheme('system');
			}
		};
		mediaQuery.addEventListener('change', handleChange);

		return () => {
			mediaQuery.removeEventListener('change', handleChange);
		};
	});

	// Get tooltip text
	const tooltip = $derived(() => {
		if (theme === 'light') return 'Light mode';
		if (theme === 'dark') return 'Dark mode';
		return 'System preference';
	});
</script>

<button
	type="button"
	onclick={cycleTheme}
	class={cn(
		'p-2 rounded-lg text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors cursor-pointer',
		className
	)}
	title={tooltip()}
	aria-label={tooltip()}
	data-testid="theme-toggle"
	{...restProps}
>
	{#if !mounted}
		<!-- Placeholder to prevent layout shift -->
		<div class="w-5 h-5"></div>
	{:else if theme === 'light'}
		<Sun class="w-5 h-5" />
	{:else if theme === 'dark'}
		<Moon class="w-5 h-5" />
	{:else}
		<Monitor class="w-5 h-5" />
	{/if}
</button>
