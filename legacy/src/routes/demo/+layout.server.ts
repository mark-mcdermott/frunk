import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { isDemo } from '$lib/roles';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// Allow the /demo POST action for non-logged-in users to initiate demo
	// But for any other demo routes, require demo user
	if (url.pathname !== '/demo' && (!locals.user || !isDemo(locals.user.roles))) {
		throw redirect(302, '/');
	}

	return {
		basePath: '/demo'
	};
};
