export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'frunk-theme';

/**
 * Runs before first paint, inlined into <head>. Reads the stored preference (or the
 * OS setting) and stamps `data-theme` on <html> so the page never paints the wrong
 * ground and flashes. The SvelteKit app applied the theme in `onMount`, which flashed
 * white on every load — see docs/PORT-PLAN.md Phase 1.
 *
 * Kept as a plain string because it has to be serialised into the document, not
 * bundled: at the point it runs there is no module runtime yet.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var s=localStorage.getItem(k);var t=(s==='light'||s==='dark')?s:(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export function setTheme(theme: Theme) {
	document.documentElement.setAttribute('data-theme', theme);
	try {
		localStorage.setItem(THEME_STORAGE_KEY, theme);
	} catch {
		// Private browsing / blocked storage — the theme still applies for this page.
	}
}

export function getTheme(): Theme {
	return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}
