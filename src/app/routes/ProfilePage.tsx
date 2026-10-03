import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Check, KeyRound, LogOut, Mail, ShieldCheck, Trash2 } from 'lucide-react';
import { useRef, useState, type ReactNode, type SubmitEvent } from 'react';
import { deleteUpload, deleteUser, getAccount, keys, setAccountPassword, uploadFile } from '../api';
import { useCrumbs } from '../AppShell';
import { TextField } from '../components/Field';
import { RecoverySetup } from '../../components/auth/RecoverySetup';
import {
	authErrorMessage,
	changeEmailAddress,
	forgetSession,
	keepDemoAccount,
	registerPasskey,
	signOut,
	toSessionUser,
	updateProfile,
	useSession
} from '../../lib/auth-client';
import { isDemo } from '../../lib/roles';
import { displayName, hasPlaceholderEmail, initial } from '../../lib/user';
import { formatDate } from '../format';
import { FileImage } from '../files';
import {
	disablePush,
	enablePush,
	pushAvailable,
	pushEnabled,
	type PushOutcome
} from '../../lib/native-push';
import { NATIVE, siteUrl } from '../../lib/platform';

/**
 * The account screen, built to `docs/mocks/profile.webp` — collapsed from its
 * five-row menu into the sections that have something real behind them:
 *
 * - **Account**: name, avatar and email. Name and avatar save through Better Auth's own
 *   endpoint so the session store refreshes and the header updates without a reload;
 *   the address goes through `change-email`, which verifies the new one by mail.
 * - **Security**: add a passkey; set a password; set up TOTP recovery. Recovery needs
 *   the password (Better Auth re-checks it before handing out a secret), so an account
 *   without one — a converted demo, or anyone who only ever used a passkey — is offered
 *   the password first. A demo account sees the keep step instead (Decision 5): an
 *   address and a name, then the passkey that makes the account theirs.
 * - **Delete account** — the self-deletion the admin screen deliberately refuses.
 *
 * The mock's Notifications and Appearance rows have nothing behind them (no
 * notification system, no applet theming) and are omitted rather than drawn dead.
 */

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className="border-t border-border pt-6">
			<h2 className="heading text-lg">{title}</h2>
			<div className="mt-4">{children}</div>
		</section>
	);
}

const SECONDARY_BUTTON =
	'flex items-center gap-2 rounded-full border border-accent/50 px-4 py-2.5 text-[0.875rem] text-text transition-colors hover:bg-accent/10 disabled:opacity-60';
const QUIET_BUTTON = 'text-[0.875rem] text-text-muted transition-colors hover:text-text';
const INPUT =
	'mt-2 h-[2.875rem] w-full rounded-control border border-border bg-surface-raised px-4 text-[0.9375rem] text-text focus:border-accent focus:outline-none';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Better Auth's default minimum; the server refuses shorter ones with a 422. */
const MIN_PASSWORD = 8;

function Positive({ children }: { children: ReactNode }) {
	return (
		<p className="flex items-center gap-2 text-[0.875rem] text-positive">
			<ShieldCheck className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
			<span>{children}</span>
		</p>
	);
}

function Failure({ error, fallback }: { error: unknown; fallback: string }) {
	if (!error) return null;
	return (
		<p role="alert" className="mt-3 text-[0.875rem] text-destructive">
			{error instanceof Error ? error.message : fallback}
		</p>
	);
}

export function ProfilePage() {
	useCrumbs([{ label: 'Profile' }]);

	const { data } = useSession();
	const user = data?.user ? toSessionUser(data.user) : null;
	const joined = (data?.user as { createdAt?: string | Date } | undefined)?.createdAt;

	if (!user) {
		return <p className="py-10 text-[0.9375rem] text-text-muted">Loading…</p>;
	}

	// Keyed on the account so the body seeds its form state from the row it is given —
	// the same pattern as the entity forms (see VendorFormPage).
	return <ProfileBody key={user.id} user={user} joined={joined} />;
}

function ProfileBody({
	user,
	joined
}: {
	user: ReturnType<typeof toSessionUser>;
	joined: string | Date | undefined;
}) {
	const client = useQueryClient();
	const demo = isDemo(user.roles);
	/* An account that was kept before the keep step asked for an address still carries
	   the placeholder the demo was minted with; it is never shown as an email. */
	const placeholder = hasPlaceholderEmail(user);
	/* Set when *this* session did the converting, so the success message survives the
	   role flip that the server-side hook applies the moment the passkey registers. */
	const [converted, setConverted] = useState(false);

	const [name, setName] = useState(user.name);
	const [nameError, setNameError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);

	const avatarInput = useRef<HTMLInputElement>(null);
	const [confirmingDelete, setConfirmingDelete] = useState(false);

	// What the session does not carry: whether a password exists, and how many passkeys.
	const account = useQuery({ queryKey: keys.account, queryFn: getAccount, enabled: !demo });
	const refreshAccount = () => client.invalidateQueries({ queryKey: keys.account });

	const saveName = useMutation({
		mutationFn: async () => {
			await updateProfile({ name: name.trim() });
		},
		onSuccess: () => {
			setSaved(true);
			setTimeout(() => setSaved(false), 2000);
		}
	});

	const saveAvatar = useMutation({
		mutationFn: async (file: File) => {
			const previous = user.image ?? null;
			const uploaded = await uploadFile(file);
			await updateProfile({ image: uploaded.url });
			// Only after the new one is saved — a failed save must not orphan the old.
			if (previous?.startsWith('/api/files/')) await deleteUpload(previous).catch(() => {});
		}
	});

	const removeAvatar = useMutation({
		mutationFn: async () => {
			const previous = user.image ?? null;
			await updateProfile({ image: null });
			if (previous?.startsWith('/api/files/')) await deleteUpload(previous).catch(() => {});
		}
	});

	const removeAccount = useMutation({
		mutationFn: () => deleteUser(user.id),
		onSuccess: () => {
			// The server already ended the session; forget it here and land signed out.
			void forgetSession().then(() => window.location.assign('/'));
		}
	});

	function submitName(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!name.trim()) {
			setNameError('Name is required');
			return;
		}
		setNameError(null);
		saveName.mutate();
	}

	const busyAvatar = saveAvatar.isPending || removeAvatar.isPending;

	return (
		<>
			<h1 className="display text-[clamp(2rem,4vw,2.75rem)]">Profile</h1>
			<p className="mt-3 text-[0.9375rem] text-text-muted">
				Manage your account information and preferences.
			</p>

			<div className="card mt-10 flex max-w-2xl flex-col gap-6 p-6 sm:p-8">
				<div className="flex items-center gap-5">
					<div className="relative">
						{user.image ? (
							<FileImage
								src={user.image}
								alt=""
								className="size-20 rounded-full border border-border object-cover"
							/>
						) : (
							<span
								aria-hidden
								className="flex size-20 items-center justify-center rounded-full bg-accent text-3xl font-semibold text-white"
							>
								{initial(user)}
							</span>
						)}
						<button
							type="button"
							disabled={busyAvatar}
							onClick={() => avatarInput.current?.click()}
							aria-label={user.image ? 'Change profile photo' : 'Add a profile photo'}
							className="absolute -right-1 -bottom-1 flex size-8 items-center justify-center rounded-full border border-border bg-surface-elevated text-text transition-colors hover:text-accent-bright disabled:opacity-60"
						>
							<Camera className="size-4" strokeWidth={1.75} aria-hidden />
						</button>
						<input
							ref={avatarInput}
							type="file"
							accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
							className="sr-only"
							aria-label="Profile photo"
							onChange={(event) => {
								const file = event.target.files?.[0];
								if (file) saveAvatar.mutate(file);
								event.target.value = '';
							}}
						/>
					</div>

					<div className="min-w-0">
						<p className="truncate text-xl font-semibold text-text">{displayName(user)}</p>
						<p className="mt-0.5 truncate text-[0.875rem] text-text-muted">
							{demo ? 'Demo account' : placeholder ? 'No email on file' : user.email}
						</p>
						{joined && (
							<p className="mt-0.5 text-[0.8125rem] text-text-faint">
								Joined {formatDate(String(joined))}
							</p>
						)}
						{user.image && (
							<button
								type="button"
								disabled={busyAvatar}
								onClick={() => removeAvatar.mutate()}
								className="mt-1.5 text-[0.8125rem] text-text-muted underline decoration-dotted underline-offset-4 transition-colors hover:text-text"
							>
								Remove photo
							</button>
						)}
					</div>
				</div>

				{(saveAvatar.isError || removeAvatar.isError) && (
					<p role="alert" className="text-[0.875rem] text-destructive">
						{(saveAvatar.error ?? removeAvatar.error) instanceof Error
							? (saveAvatar.error ?? removeAvatar.error)!.message
							: 'Could not update your photo.'}
					</p>
				)}

				<Section title="Account Information">
					<form onSubmit={submitName} noValidate className="flex max-w-sm flex-col gap-4">
						<TextField
							id="profile-name"
							label="Full Name"
							error={nameError ?? undefined}
							value={name}
							onChange={setName}
						/>
						<div className="flex items-center gap-3">
							<button
								type="submit"
								disabled={saveName.isPending}
								className="btn-primary disabled:opacity-60"
							>
								{saveName.isPending ? 'Saving…' : 'Save Changes'}
							</button>
							{saved && (
								<span className="flex items-center gap-1.5 text-[0.875rem] text-positive">
									<Check className="size-4" strokeWidth={2} aria-hidden /> Saved
								</span>
							)}
						</div>
						<Failure error={saveName.error} fallback="Could not save." />
					</form>

					{!demo && <EmailSettings user={user} placeholder={placeholder} />}
				</Section>

				<Section title="Security">
					{demo || converted ? (
						<KeepAccount
							user={user}
							converted={converted}
							onConverted={() => {
								setConverted(true);
								refreshAccount();
							}}
						/>
					) : (
						<SecuritySettings
							user={user}
							placeholder={placeholder}
							hasPassword={account.data?.hasPassword}
							onPasswordSet={refreshAccount}
						/>
					)}
				</Section>

				{(!demo || pushAvailable()) && <ReminderSettings user={user} byEmail={!demo} />}

				<Section title="Session">
					<button
						type="button"
						onClick={() => signOut().then(() => window.location.assign('/'))}
						className="flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-[0.875rem] text-text-muted transition-colors hover:border-border-strong hover:text-text"
					>
						<LogOut className="size-4" strokeWidth={1.75} aria-hidden />
						Sign out
					</button>
				</Section>

				{/* In the app there is no site footer to find these in. */}
				{NATIVE && (
					<Section title="About">
						<p className="text-[0.875rem] text-text-muted">
							<a
								href={siteUrl('/privacy')}
								target="_blank"
								rel="noreferrer"
								className="text-accent-bright transition-opacity hover:opacity-80"
							>
								Privacy policy
							</a>
							<span aria-hidden> · </span>
							<a
								href={siteUrl('/terms')}
								target="_blank"
								rel="noreferrer"
								className="text-accent-bright transition-opacity hover:opacity-80"
							>
								Terms of service
							</a>
							<span aria-hidden> · </span>
							<a
								href={siteUrl('/contact')}
								target="_blank"
								rel="noreferrer"
								className="text-accent-bright transition-opacity hover:opacity-80"
							>
								Contact
							</a>
						</p>
					</Section>
				)}

				<Section title="Delete Account">
					{confirmingDelete ? (
						<div>
							<p className="max-w-md text-[0.875rem] text-text-muted">
								Your vehicles, documents, repairs, notes and files are deleted with the account.
								This cannot be undone.
							</p>
							<div className="mt-4 flex items-center gap-3">
								<button
									type="button"
									disabled={removeAccount.isPending}
									onClick={() => removeAccount.mutate()}
									className="rounded-full bg-destructive px-5 py-3 text-[0.9375rem] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
								>
									{removeAccount.isPending ? 'Deleting…' : 'Delete my account permanently'}
								</button>
								<button
									type="button"
									onClick={() => setConfirmingDelete(false)}
									className="text-[0.9375rem] text-text-muted transition-colors hover:text-text"
								>
									Cancel
								</button>
							</div>
							<Failure error={removeAccount.error} fallback="Could not delete the account." />
						</div>
					) : (
						<button
							type="button"
							onClick={() => setConfirmingDelete(true)}
							className="flex items-center gap-2 rounded-full border border-destructive/40 px-4 py-2.5 text-[0.875rem] text-destructive transition-colors hover:bg-destructive-bg"
						>
							<Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
							Delete Account
						</button>
					)}
				</Section>
			</div>
		</>
	);
}

/**
 * The address on a real account: shown with its verification state, and changeable.
 * Because the placeholder a converted demo carries is never shown, "Add an email" and
 * "Change email" are the same form with different words.
 */
/**
 * The maintenance digest's opt-out. One switch, saved the moment it is flipped: an
 * email that cannot be turned off from the account that receives it is not a
 * reminder, it is spam.
 */
function ReminderSettings({
	user,
	byEmail
}: {
	user: ReturnType<typeof toSessionUser>;
	/** A demo has no address to write to, so it is offered the phone alone. */
	byEmail: boolean;
}) {
	const client = useQueryClient();
	const [enabled, setEnabled] = useState(user.remindersByEmail);

	const save = useMutation({
		mutationFn: async (remindersByEmail: boolean) => {
			await updateProfile({ remindersByEmail });
			return remindersByEmail;
		},
		onSuccess: setEnabled
	});

	// Only the native app has a phone to notify; on the web this query never runs.
	const phone = useQuery({
		queryKey: ['push-enabled'],
		queryFn: pushEnabled,
		enabled: pushAvailable()
	});
	const notify = useMutation({
		mutationFn: async (on: boolean): Promise<PushOutcome | 'off'> => {
			if (on) return enablePush();
			await disablePush();
			return 'off';
		},
		onSuccess: () => client.invalidateQueries({ queryKey: ['push-enabled'] })
	});

	return (
		<Section title="Reminders">
			<div className="flex max-w-md flex-col gap-5">
				{pushAvailable() && (
					<label className="flex items-start gap-3 text-[0.9375rem] text-text">
						<input
							type="checkbox"
							checked={notify.isPending ? notify.variables : (phone.data ?? false)}
							disabled={notify.isPending || phone.isPending}
							onChange={(event) => notify.mutate(event.target.checked)}
							className="mt-1 size-4 shrink-0 rounded accent-accent"
						/>
						<span>
							Notify me on this phone
							<span className="mt-1 block text-[0.8125rem] text-text-muted">
								A notification when a service is overdue or due within a month, or a renewal is
								about to expire. Once per item, not every day.
							</span>
						</span>
					</label>
				)}
				{notify.data === 'denied' && (
					<p role="alert" className="text-[0.8125rem] text-destructive">
						Notifications are turned off for Frunk. Allow them in Settings, then switch this on
						again.
					</p>
				)}
				{notify.data === 'unreachable' && (
					<p role="alert" className="text-[0.8125rem] text-destructive">
						This phone could not be registered for notifications just now. Check the connection and
						switch this on again.
					</p>
				)}

				{byEmail && (
					<label className="flex items-start gap-3 text-[0.9375rem] text-text">
						<input
							type="checkbox"
							checked={save.isPending ? save.variables : enabled}
							disabled={save.isPending}
							onChange={(event) => save.mutate(event.target.checked)}
							className="mt-1 size-4 shrink-0 rounded accent-accent"
						/>
						<span>
							Email me when maintenance is due
							<span className="mt-1 block text-[0.8125rem] text-text-muted">
								One message a day at most, only when something on a schedule is overdue or due
								within a month, and once per item until it is marked done.
							</span>
						</span>
					</label>
				)}
			</div>
			<Failure error={save.error ?? notify.error} fallback="Could not save that." />
		</Section>
	);
}

function EmailSettings({
	user,
	placeholder
}: {
	user: ReturnType<typeof toSessionUser>;
	placeholder: boolean;
}) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [sentTo, setSentTo] = useState<string | null>(null);

	const change = useMutation({
		mutationFn: (email: string) => changeEmailAddress(email),
		onSuccess: (_, email) => {
			setSentTo(email);
			setEditing(false);
			setDraft('');
		}
	});

	function submit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		const email = draft.trim().toLowerCase();
		if (!EMAIL_PATTERN.test(email)) {
			setError('Enter a valid email address');
			return;
		}
		setError(null);
		change.mutate(email);
	}

	return (
		<div className="mt-6 max-w-sm">
			<p className="text-[0.8125rem] font-medium text-text">Email</p>
			{placeholder ? (
				<p className="mt-1 text-[0.875rem] text-text-muted">
					No email on file. This account started as a demo; add an address so recovery and account
					mail have somewhere to go.
				</p>
			) : (
				<p className="mt-1 text-[0.875rem] text-text-muted">
					<span className="text-text">{user.email}</span>
					{!user.emailVerified && ' — not verified yet; check your inbox for the link.'}
				</p>
			)}

			{sentTo && (
				<p className="mt-2 flex items-center gap-2 text-[0.875rem] text-positive">
					<Mail className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
					<span>
						Check your inbox at <span className="font-medium">{sentTo}</span> for the confirmation
						link.
					</span>
				</p>
			)}

			{editing ? (
				<form onSubmit={submit} noValidate className="mt-3">
					<label htmlFor="new-email" className="text-[0.8125rem] font-medium text-text">
						New email address
					</label>
					<input
						id="new-email"
						type="email"
						autoComplete="email"
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						className={INPUT}
					/>
					{error && (
						<p role="alert" className="mt-2 text-[0.8125rem] text-destructive">
							{error}
						</p>
					)}
					<div className="mt-3 flex items-center gap-3">
						<button
							type="submit"
							disabled={change.isPending}
							className="btn-primary disabled:opacity-60"
						>
							{change.isPending ? 'Sending…' : 'Send confirmation'}
						</button>
						<button
							type="button"
							onClick={() => {
								setEditing(false);
								setError(null);
							}}
							className={QUIET_BUTTON}
						>
							Cancel
						</button>
					</div>
					<Failure error={change.error} fallback="Could not change the address." />
				</form>
			) : (
				<button
					type="button"
					onClick={() => setEditing(true)}
					className={`mt-3 ${SECONDARY_BUTTON}`}
				>
					<Mail className="size-4 text-accent-bright" strokeWidth={1.75} aria-hidden />
					{placeholder ? 'Add an email' : 'Change email'}
				</button>
			)}
		</div>
	);
}

/**
 * The keep step (Decision 5). A demo visitor who wants their garage to outlive the
 * week gives an address and a name, and adds a passkey — the passkey is what makes the
 * account theirs; the address is what the passkey is labelled with and where account
 * mail goes. The ceremony runs first, so cancelling it leaves the demo exactly as it
 * was.
 */
function KeepAccount({
	user,
	converted,
	onConverted
}: {
	user: ReturnType<typeof toSessionUser>;
	converted: boolean;
	onConverted: () => void;
}) {
	const [email, setEmail] = useState('');
	const [name, setName] = useState(user.name === 'Anonymous' ? '' : user.name);
	const [errors, setErrors] = useState<{ email?: string; name?: string }>({});
	const [keptAs, setKeptAs] = useState<string | null>(null);
	const [failure, setFailure] = useState<string | null>(null);

	const keep = useMutation({
		mutationFn: keepDemoAccount,
		onSuccess: (_, input) => {
			setKeptAs(input.email);
			onConverted();
		},
		onError: (cause) => setFailure(authErrorMessage(cause))
	});

	function submit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		const found: { email?: string; name?: string } = {};
		const address = email.trim().toLowerCase();
		if (!EMAIL_PATTERN.test(address)) found.email = 'Enter a valid email address';
		if (!name.trim()) found.name = 'Name is required';
		setErrors(found);
		if (found.email || found.name) return;
		setFailure(null);
		keep.mutate({ email: address, name: name.trim() });
	}

	if (converted) {
		return (
			<div className="flex flex-col gap-2">
				<Positive>Passkey added — this account is yours now, data and all.</Positive>
				{keptAs && (
					<p className="flex items-center gap-2 text-[0.875rem] text-text-muted">
						<Mail className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
						<span>
							Check your inbox at <span className="text-text">{keptAs}</span> for the confirmation
							link.
						</span>
					</p>
				)}
			</div>
		);
	}

	return (
		<form onSubmit={submit} noValidate className="max-w-sm">
			<p className="text-[0.875rem] text-text-muted">
				This is a demo account. Keep it by adding a passkey — everything you have added stays. Your
				address is what the passkey is saved under, and where account mail goes.
			</p>
			<div className="mt-4 flex flex-col gap-4">
				<TextField
					id="keep-email"
					label="Email address"
					type="email"
					autoComplete="email"
					error={errors.email}
					value={email}
					onChange={setEmail}
				/>
				<TextField
					id="keep-name"
					label="Your name"
					autoComplete="name"
					error={errors.name}
					value={name}
					onChange={setName}
				/>
			</div>
			<button type="submit" disabled={keep.isPending} className={`mt-4 ${SECONDARY_BUTTON}`}>
				<KeyRound className="size-4 text-accent-bright" strokeWidth={1.75} aria-hidden />
				{keep.isPending ? 'Waiting for your device…' : 'Add a passkey and keep it'}
			</button>
			{failure && (
				<p role="alert" className="mt-3 text-[0.875rem] text-destructive">
					{failure}
				</p>
			)}
		</form>
	);
}

/**
 * A real account's credentials: another passkey, a password where there is none, and
 * TOTP recovery once there is one. `hasPassword` is undefined while it loads, in which
 * case neither the password form nor the recovery button is offered yet.
 */
function SecuritySettings({
	user,
	placeholder,
	hasPassword,
	onPasswordSet
}: {
	user: ReturnType<typeof toSessionUser>;
	placeholder: boolean;
	hasPassword: boolean | undefined;
	onPasswordSet: () => void;
}) {
	const [security, setSecurity] = useState<
		'idle' | 'password' | 'recovery' | 'recovery-done' | 'passkey-added'
	>('idle');
	const [password, setPassword] = useState('');
	const [securityError, setSecurityError] = useState<string | null>(null);

	const [settingPassword, setSettingPassword] = useState(false);
	const [newPassword, setNewPassword] = useState('');
	const [passwordError, setPasswordError] = useState<string | null>(null);
	const [passwordSet, setPasswordSet] = useState(false);

	const addPasskey = useMutation({
		mutationFn: () => registerPasskey(placeholder ? undefined : user.email),
		onSuccess: () => setSecurity('passkey-added'),
		onError: (cause) => setSecurityError(authErrorMessage(cause))
	});

	const savePassword = useMutation({
		mutationFn: (value: string) => setAccountPassword(value),
		onSuccess: () => {
			setPasswordSet(true);
			setSettingPassword(false);
			setNewPassword('');
			onPasswordSet();
		}
	});

	function submitPassword(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		if (newPassword.length < MIN_PASSWORD) {
			setPasswordError(`Use at least ${MIN_PASSWORD} characters`);
			return;
		}
		setPasswordError(null);
		savePassword.mutate(newPassword);
	}

	return (
		<div className="flex flex-col gap-5">
			<div className="flex flex-wrap items-center gap-3">
				<button
					type="button"
					disabled={addPasskey.isPending}
					onClick={() => addPasskey.mutate()}
					className={SECONDARY_BUTTON}
				>
					<KeyRound className="size-4 text-accent-bright" strokeWidth={1.75} aria-hidden />
					{addPasskey.isPending ? 'Waiting for your device…' : 'Add a passkey'}
				</button>
				{security === 'passkey-added' && (
					<span className="flex items-center gap-1.5 text-[0.875rem] text-positive">
						<Check className="size-4" strokeWidth={2} aria-hidden /> Added
					</span>
				)}
			</div>

			{hasPassword === false ? (
				settingPassword ? (
					<form onSubmit={submitPassword} noValidate className="max-w-sm">
						<label htmlFor="new-password" className="text-[0.8125rem] font-medium text-text">
							New password
						</label>
						<input
							id="new-password"
							type="password"
							autoComplete="new-password"
							value={newPassword}
							onChange={(event) => setNewPassword(event.target.value)}
							className={INPUT}
						/>
						{passwordError && (
							<p role="alert" className="mt-2 text-[0.8125rem] text-destructive">
								{passwordError}
							</p>
						)}
						<div className="mt-3 flex items-center gap-3">
							<button
								type="submit"
								disabled={savePassword.isPending}
								className="btn-primary disabled:opacity-60"
							>
								{savePassword.isPending ? 'Saving…' : 'Save password'}
							</button>
							<button
								type="button"
								onClick={() => {
									setSettingPassword(false);
									setPasswordError(null);
								}}
								className={QUIET_BUTTON}
							>
								Cancel
							</button>
						</div>
						<Failure error={savePassword.error} fallback="Could not set the password." />
					</form>
				) : (
					<div>
						<p className="max-w-md text-[0.875rem] text-text-muted">
							This account has no password. Recovery needs one, and so does signing in anywhere a
							passkey cannot reach.
						</p>
						<button
							type="button"
							onClick={() => setSettingPassword(true)}
							className={`mt-3 ${SECONDARY_BUTTON}`}
						>
							<ShieldCheck className="size-4 text-accent-bright" strokeWidth={1.75} aria-hidden />
							Set a password
						</button>
					</div>
				)
			) : hasPassword === undefined ? null : (
				<>
					{passwordSet && <Positive>Password set.</Positive>}
					{user.twoFactorEnabled || security === 'recovery-done' ? (
						<Positive>Recovery is set up — a lost device is not a lost account.</Positive>
					) : security === 'idle' || security === 'passkey-added' ? (
						<div>
							<p className="max-w-md text-[0.875rem] text-text-muted">
								A passkey lives on one device. Recovery is how you get back in after losing it.
							</p>
							<button
								type="button"
								onClick={() => setSecurity('password')}
								className={`mt-3 ${SECONDARY_BUTTON}`}
							>
								<ShieldCheck className="size-4 text-accent-bright" strokeWidth={1.75} aria-hidden />
								Set up recovery
							</button>
						</div>
					) : security === 'password' ? (
						<form
							onSubmit={(event) => {
								event.preventDefault();
								if (password) setSecurity('recovery');
							}}
							className="max-w-sm"
						>
							<label htmlFor="confirm-password" className="text-[0.8125rem] font-medium text-text">
								Confirm your password to continue
							</label>
							<input
								id="confirm-password"
								type="password"
								autoComplete="current-password"
								value={password}
								onChange={(event) => setPassword(event.target.value)}
								className={INPUT}
							/>
							<div className="mt-3 flex items-center gap-3">
								<button type="submit" className="btn-primary">
									Continue
								</button>
								<button
									type="button"
									onClick={() => {
										setSecurity('idle');
										setPassword('');
									}}
									className={QUIET_BUTTON}
								>
									Cancel
								</button>
							</div>
						</form>
					) : (
						<div className="max-w-sm">
							<RecoverySetup
								password={password}
								onDone={() => {
									setSecurity('recovery-done');
									setPassword('');
								}}
								onSkip={() => {
									setSecurity('idle');
									setPassword('');
								}}
							/>
						</div>
					)}
				</>
			)}

			{securityError && (
				<p role="alert" className="text-[0.875rem] text-destructive">
					{securityError}
				</p>
			)}
		</div>
	);
}
