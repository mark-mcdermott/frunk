/** Primary marketing navigation, shared by the header, the home hero and the footer. */
export const primaryNav = [
	{ label: 'Features', href: '/#features' },
	{ label: 'Security', href: '/#security' },
	// Pricing is unpublished until there is billing behind it — the page advertised three
	// prices and a free trial with no checkout. Restore this line and rename
	// `src/pages/_pricing.astro` back to `pricing.astro` together.
	// { label: 'Pricing', href: '/pricing' },
	{ label: 'About', href: '/about' }
] as const;
