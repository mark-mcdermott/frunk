import { useMutation } from '@tanstack/react-query';
import { Camera, Check, KeyRound, LogOut, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode, type SubmitEvent } from 'react';
import { deleteUpload, deleteUser, uploadFile } from '../api';
import { useCrumbs } from '../AppShell';
import { TextField } from '../components/Field';
import { RecoverySetup } from '../../components/auth/RecoverySetup';
import {
	authErrorMessage,
	registerPasskey,
	signOut,
	toSessionUser,
	updateProfile,
	useSession
} from '../../lib/auth-client';
import { isDemo } from '../../lib/roles';
import { displayName, initial } from '../../lib/user';
import { formatDate } from '../format';

/**
 * The account screen, built to `docs/mocks/profile.webp` — collapsed from its
 * five-row menu into the sections that have something real behind them:
 *
 * - **Account**: name and avatar. Both save through Better Auth's own endpoint so the
 *   session store refreshes and the header avatar updates without a reload.
 * - **Security**: add a passkey; set up TOTP recovery. This is where `RecoverySetup`
 *   finally becomes reachable again — sign-up offers it once, and until now there was
 *   no second chance. Recovery needs the account password (Better Auth re-checks it
 *   before handing out a secret), so a demo account — which has none — sees the
 *   convert-by-passkey prompt instead (Decision 5).
 * - **Delete account** — the self-deletion the admin screen deliberately refuses.
 *
 * The mock's Notifications and Appearance rows have nothing behind them (no
 * notification system, no applet theming) and are omitted rather than drawn dead.
 */

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className="border-t border-border pt-6">
			<h2 className="display-sm text-lg">{title}</h2>
			<div className="mt-4">{children}</div>
		</section>
	);
}

const SECONDARY_BUTTON =
	'flex items-center gap-2 rounded-full border border-accent/50 px-4 py-2.5 text-[0.875rem] text-text transition-colors hover:bg-accent/10 disabled:opacity-60';

export function ProfilePage() {
	useCrumbs([{ label: 'Profile' }]);

	const { data } = useSession();
	const user = data?.user ? toSessionUser(data.user) : null;
	const joined = (data?.user as { createdAt?: string | Date } | undefined)?.createdAt;
	const demo = user ? isDemo(user.roles) && user.email.endsWith('.invalid') : false;

	const [name, setName] = useState('');
	const [nameError, setNameError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);
	useEffect(() => {
		if (user && !name) setName(user.name);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [user?.id]);

	const avatarInput = useRef<HTMLInputElement>(null);
	const [security, setSecurity] = useState<
		'idle' | 'password' | 'recovery' | 'recovery-done' | 'passkey-added'
	>('idle');
	const [password, setPassword] = useState('');
	const [securityError, setSecurityError] = useState<string | null>(null);
	const [confirmingDelete, setConfirmingDelete] = useState(false);

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
			const previous = user?.image ?? null;
			const uploaded = await uploadFile(file);
			await updateProfile({ image: uploaded.url });
			// Only after the new one is saved — a failed save must not orphan the old.
			if (previous?.startsWith('/api/files/')) await deleteUpload(previous).catch(() => {});
		}
	});

	const removeAvatar = useMutation({
		mutationFn: async () => {
			const previous = user?.image ?? null;
			await updateProfile({ image: null });
			if (previous?.startsWith('/api/files/')) await deleteUpload(previous).catch(() => {});
		}
	});

	const addPasskey = useMutation({
		mutationFn: () => registerPasskey(),
		onSuccess: () => setSecurity('passkey-added'),
		onError: (cause) => setSecurityError(authErrorMessage(cause))
	});

	const removeAccount = useMutation({
		mutationFn: () => deleteUser(user?.id ?? ''),
		onSuccess: () => {
			// The server already ended the session; land on the marketing page signed out.
			window.location.assign('/');
		}
	});

	if (!user) {
		return <p className="py-10 text-[0.9375rem] text-text-muted">Loading…</p>;
	}

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
							<img
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
							{demo ? 'Demo account' : user.email}
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
						{!demo && (
							<p className="text-[0.8125rem] text-text-muted">
								Signed in as <span className="text-text">{user.email}</span>. Changing the address
								needs a verified email flow, which is not built yet.
							</p>
						)}
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
						{saveName.isError && (
							<p role="alert" className="text-[0.875rem] text-destructive">
								{saveName.error instanceof Error ? saveName.error.message : 'Could not save.'}
							</p>
						)}
					</form>
				</Section>

				<Section title="Security">
					{demo ? (
						security === 'passkey-added' ? (
							<p className="flex items-center gap-2 text-[0.9375rem] text-positive">
								<ShieldCheck className="size-5" strokeWidth={1.75} aria-hidden />
								Passkey added — this account is yours now, data and all.
							</p>
						) : (
							<div>
								<p className="max-w-md text-[0.875rem] text-text-muted">
									This is a demo account. Add a passkey and it becomes a real one — everything you
									have added stays.
								</p>
								<button
									type="button"
									disabled={addPasskey.isPending}
									onClick={() => addPasskey.mutate()}
									className={`mt-4 ${SECONDARY_BUTTON}`}
								>
									<KeyRound className="size-4 text-accent-bright" strokeWidth={1.75} aria-hidden />
									{addPasskey.isPending ? 'Waiting for your device…' : 'Add a passkey'}
								</button>
							</div>
						)
					) : (
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

							{user.twoFactorEnabled || security === 'recovery-done' ? (
								<p className="flex items-center gap-2 text-[0.875rem] text-positive">
									<ShieldCheck className="size-4" strokeWidth={1.75} aria-hidden />
									Recovery is set up — a lost device is not a lost account.
								</p>
							) : security === 'idle' ? (
								<div>
									<p className="max-w-md text-[0.875rem] text-text-muted">
										A passkey lives on one device. Recovery is how you get back in after losing it.
									</p>
									<button
										type="button"
										onClick={() => setSecurity('password')}
										className={`mt-3 ${SECONDARY_BUTTON}`}
									>
										<ShieldCheck
											className="size-4 text-accent-bright"
											strokeWidth={1.75}
											aria-hidden
										/>
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
									<label
										htmlFor="confirm-password"
										className="text-[0.8125rem] font-medium text-text"
									>
										Confirm your password to continue
									</label>
									<input
										id="confirm-password"
										type="password"
										autoComplete="current-password"
										value={password}
										onChange={(event) => setPassword(event.target.value)}
										className="mt-2 h-[2.875rem] w-full rounded-control border border-border bg-surface-raised px-4 text-[0.9375rem] text-text focus:border-accent focus:outline-none"
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
											className="text-[0.875rem] text-text-muted transition-colors hover:text-text"
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

							{securityError && (
								<p role="alert" className="text-[0.875rem] text-destructive">
									{securityError}
								</p>
							)}
						</div>
					)}
				</Section>

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
							{removeAccount.isError && (
								<p role="alert" className="mt-3 text-[0.875rem] text-destructive">
									{removeAccount.error instanceof Error
										? removeAccount.error.message
										: 'Could not delete the account.'}
								</p>
							)}
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
