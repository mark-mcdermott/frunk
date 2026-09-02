/**
 * Utility for demo-aware routing.
 * Prefixes paths with /demo when in demo mode.
 */

export function demoPath(path: string, isDemo: boolean): string {
	if (!isDemo) return path;
	// Don't double-prefix
	if (path.startsWith('/demo')) return path;
	return `/demo${path}`;
}

/**
 * Check if current path is a demo path
 */
export function isDemoPath(pathname: string): boolean {
	return pathname.startsWith('/demo/') || pathname === '/demo';
}
