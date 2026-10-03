import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { useParams } from 'react-router';
import { deleteUser, getUser, keys, updateUser } from '../api';
import { useCrumbs } from '../AppShell';
import { useLeave } from '../history';
import { TextField } from '../components/Field';
import { toSessionUser, useSession } from '../../lib/auth-client';
import { ROLE_IDS } from '../../lib/roles';
import { initial } from '../../lib/user';

/**
 * The admin user edit, built to `docs/mocks/admin-users-edit.webp`.
 *
 * **Departures from the mock, each because it draws data that does not exist:**
 * - **Roles are checkboxes, not one dropdown** — `roles` is an array and the mock's
 *   own index shows a user wearing Admin *and* User.
 * - **No Status select** — there is no active/inactive column.
 * - **No Permissions checklist** — there is no permissions model, only the three roles.
 * - **Email is read-only** — changing an address belongs to Better Auth's verified
 *   change-email flow, not a raw column write from an admin form.
 * - **No avatar upload.** Files are served from the *owner's* `u/<userId>/` prefix,
 *   so an avatar an admin uploaded would live under the admin's prefix and 404 for
 *   the user it belongs to. Avatars come with the profile screen, where the uploader
 *   is the owner.
 *
 * Deleting yourself is blocked here: the API allows it (it is how account deletion
 * works), but doing it from the admin screen ends your session mid-task. The profile
 * screen owns that flow.
 */

const ROLE_OPTIONS = [
	{ id: ROLE_IDS.ADMIN, label: 'Admin', hint: 'Full access, including this screen.' },
	{ id: ROLE_IDS.USER, label: 'User', hint: 'A regular account.' },
	{ id: ROLE_IDS.DEMO, label: 'Demo', hint: 'A trial account, reaped after inactivity.' }
];

type LoadedUser = NonNullable<Awaited<ReturnType<typeof getUser>>>;

export function UserFormPage() {
	const { id = '' } = useParams();

	const { data: sessionData } = useSession();
	const sessionUser = sessionData?.user ? toSessionUser(sessionData.user) : null;
	const editingSelf = sessionUser?.id === id;

	const {
		data: user,
		isPending,
		isError,
		error
	} = useQuery({
		queryKey: keys.user(id),
		queryFn: () => getUser(id)
	});

	if (isPending) {
		return <p className="py-10 text-[0.9375rem] text-text-muted">Loading…</p>;
	}

	if (isError || !user) {
		return (
			<p role="alert" className="py-10 text-[0.9375rem] text-destructive">
				{error instanceof Error ? error.message : 'User not found'}
			</p>
		);
	}

	// Keyed on the row so the form is seeded from it at mount — see VendorFormPage.
	return <UserForm key={user.id} user={user} editingSelf={editingSelf} />;
}

function UserForm({ user, editingSelf }: { user: LoadedUser; editingSelf: boolean }) {
	const id = user.id;
	const leave = useLeave();
	const client = useQueryClient();

	const [name, setName] = useState(user.name);
	const [roles, setRoles] = useState<number[]>(user.roles);
	const [nameError, setNameError] = useState<string | null>(null);
	const [confirmingDelete, setConfirmingDelete] = useState(false);

	useCrumbs([{ label: user ? user.name || user.email : 'User' }, { label: 'Edit' }]);

	const save = useMutation({
		mutationFn: () => updateUser(id, { name: name.trim(), roles }),
		onSuccess: () => {
			client.invalidateQueries({ queryKey: ['users'] });
			leave('/users');
		}
	});

	const remove = useMutation({
		mutationFn: () => deleteUser(id),
		onSuccess: () => {
			client.invalidateQueries({ queryKey: ['users'] });
			leave('/users', `/users/${id}`);
		}
	});

	function toggleRole(roleId: number) {
		setRoles((prev) =>
			prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId].sort()
		);
	}

	function submit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!name.trim()) {
			setNameError('Name is required');
			return;
		}
		setNameError(null);
		save.mutate();
	}

	const busy = save.isPending || remove.isPending;

	return (
		<>
			<h1 className="display text-[clamp(2rem,4vw,2.75rem)]">Edit User</h1>
			<p className="mt-3 text-[0.9375rem] text-text-muted">Update user details and roles.</p>

			<form onSubmit={submit} noValidate className="card mt-10 max-w-xl p-6 sm:p-8">
				<div className="flex items-center gap-4">
					<span
						aria-hidden
						className="flex size-14 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-lg font-semibold text-text"
					>
						{initial(user)}
					</span>
					<div className="min-w-0">
						<p className="truncate text-[0.9375rem] font-medium text-text">{user.email}</p>
						<p className="mt-0.5 font-mono text-[0.75rem] text-text-faint" title={user.id}>
							{user.id}
						</p>
					</div>
				</div>

				<div className="mt-8 flex flex-col gap-5">
					<TextField
						id="name"
						label="Full Name"
						error={nameError ?? undefined}
						value={name}
						onChange={setName}
					/>

					<fieldset>
						<legend className="text-[0.8125rem] font-medium text-text">Roles</legend>
						<div className="mt-3 flex flex-col gap-3 rounded-control border border-border bg-surface-raised p-4">
							{ROLE_OPTIONS.map((role) => (
								<label
									key={role.id}
									htmlFor={`role-${role.id}`}
									className="flex cursor-pointer items-start gap-3"
								>
									<input
										id={`role-${role.id}`}
										type="checkbox"
										checked={roles.includes(role.id)}
										onChange={() => toggleRole(role.id)}
										className="mt-0.5 size-4 accent-[#6438cc]"
									/>
									<span>
										<span className="block text-[0.875rem] font-medium text-text">
											{role.label}
										</span>
										<span className="block text-[0.8125rem] text-text-muted">{role.hint}</span>
									</span>
								</label>
							))}
						</div>
						{editingSelf && roles.length > 0 && !roles.includes(ROLE_IDS.ADMIN) && (
							<p className="mt-2 text-[0.8125rem] text-destructive">
								You are removing your own admin role — you will lose access to this screen the
								moment you save.
							</p>
						)}
					</fieldset>
				</div>

				{(save.isError || remove.isError) && (
					<p role="alert" className="mt-6 text-[0.875rem] text-destructive">
						{(save.error ?? remove.error) instanceof Error
							? (save.error ?? remove.error)!.message
							: 'Could not save this user.'}
					</p>
				)}

				<div className="mt-8 flex flex-wrap items-center gap-3">
					<button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
						{save.isPending ? 'Saving…' : 'Save Changes'}
					</button>

					{!editingSelf &&
						(confirmingDelete ? (
							<div className="flex items-center gap-3">
								<button
									type="button"
									disabled={busy}
									onClick={() => remove.mutate()}
									className="rounded-full bg-destructive px-5 py-3 text-[0.9375rem] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
								>
									{remove.isPending ? 'Deleting…' : 'Delete permanently'}
								</button>
								<button
									type="button"
									onClick={() => setConfirmingDelete(false)}
									className="text-[0.9375rem] text-text-muted transition-colors hover:text-text"
								>
									Cancel
								</button>
							</div>
						) : (
							<button
								type="button"
								onClick={() => setConfirmingDelete(true)}
								className="flex items-center gap-2 rounded-full border border-destructive/40 px-5 py-3 text-[0.9375rem] text-destructive transition-colors hover:bg-destructive-bg"
							>
								<Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
								Delete User
							</button>
						))}

					{editingSelf && (
						<p className="text-[0.8125rem] text-text-muted">
							This is your account — deleting it belongs to your profile, not the admin screen.
						</p>
					)}
				</div>

				{confirmingDelete && (
					<p className="mt-4 text-[0.8125rem] text-text-muted">
						Their vehicles, documents, repairs, notes and files are deleted with the account. This
						cannot be undone.
					</p>
				)}
			</form>
		</>
	);
}
