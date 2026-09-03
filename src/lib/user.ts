/**
 * The user shape the API hands out — the only projection of the `user` row that ever
 * leaves the server.
 *
 * It lives here, framework-free and free of server imports, because both sides need
 * it: `api/_lib/session.ts` builds it and the React islands consume it. One definition
 * means a column added to the select cannot quietly diverge from what the UI expects.
 */
export interface SessionUser {
	id: number;
	uuid: string;
	/** An email address. `username` is the legacy column name. */
	username: string;
	avatar: string | null;
	roles: number[];
	/** Whether a recovery code is set up. Never widen this to the secret itself. */
	totpEnabled: boolean;
}

/** The label for an account in the nav — the local part of the address. */
export function displayName(user: SessionUser): string {
	const [local] = user.username.split('@');
	return local || user.username;
}

export function initial(user: SessionUser): string {
	return displayName(user).charAt(0).toUpperCase();
}
