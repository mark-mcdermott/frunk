/**
 * The user shape the API hands out — the only projection of the `user` row that ever
 * leaves the server.
 *
 * It lives here, framework-free and free of server imports, because both sides need
 * it: `api/_lib/session.ts` builds it and the React islands consume it. One definition
 * means a column added to the select cannot quietly diverge from what the UI expects.
 *
 * Field names follow Better Auth's (Decision 2), which is why `username` is now
 * `email`, `avatar` is `image`, and `uuid` is gone — `id` is the identity.
 */
export interface SessionUser {
	/** Better Auth's text id. This is the identity every `user_id` column targets. */
	id: string;
	email: string;
	/** Required by Better Auth, so always present — may be the address's local part. */
	name: string;
	image: string | null;
	roles: number[];
	emailVerified: boolean;
	/** Whether a recovery factor is set up. Never widen this to the secret itself. */
	twoFactorEnabled: boolean;
	/** Whether the maintenance digest may write to this address. */
	remindersByEmail: boolean;
}

/**
 * The label for an account in the nav. Prefers the name Better Auth now requires,
 * falling back to the address's local part when it is only a placeholder.
 */
export function displayName(user: Pick<SessionUser, 'name' | 'email'>): string {
	const name = user.name?.trim();
	if (name) return name;

	const [local] = user.email.split('@');
	return local || user.email;
}

export function initial(user: Pick<SessionUser, 'name' | 'email'>): string {
	return displayName(user).charAt(0).toUpperCase();
}

/**
 * A demo account's address is a placeholder the anonymous plugin minted
 * (`…@anonymous.placeholder.invalid`). Conversion keeps it — there is no real address to
 * put there — so a converted account has an email column but no email. Never show it,
 * and never send to it.
 */
export function hasPlaceholderEmail(user: Pick<SessionUser, 'email'>): boolean {
	return user.email.endsWith('.invalid');
}
