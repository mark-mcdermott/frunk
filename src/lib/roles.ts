// Role IDs (must match seeded data in database)
export const ROLE_IDS = {
	DEMO: 1,
	USER: 2,
	ADMIN: 3
} as const;

export function hasRole(userRoles: number[] | null | undefined, roleId: number): boolean {
	if (!userRoles) return false;
	return userRoles.includes(roleId);
}

export function isAdmin(userRoles: number[] | null | undefined): boolean {
	return hasRole(userRoles, ROLE_IDS.ADMIN);
}

export function isUser(userRoles: number[] | null | undefined): boolean {
	return hasRole(userRoles, ROLE_IDS.USER);
}

export function isDemo(userRoles: number[] | null | undefined): boolean {
	return hasRole(userRoles, ROLE_IDS.DEMO);
}

export function getRoleNames(userRoles: number[] | null | undefined): string[] {
	if (!userRoles) return [];
	const names: string[] = [];
	if (userRoles.includes(ROLE_IDS.ADMIN)) names.push('Admin');
	if (userRoles.includes(ROLE_IDS.USER)) names.push('User');
	if (userRoles.includes(ROLE_IDS.DEMO)) names.push('Demo');
	return names;
}
