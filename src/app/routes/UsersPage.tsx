import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Pencil, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { keys, listUsers, type AdminUser } from '../api';
import { IconButton, ListEmpty, ListState, SearchInput } from '../components/List';
import { getRoleNames } from '../../lib/roles';
import { initial } from '../../lib/user';

/**
 * The admin user list, built to `docs/mocks/users-index.webp`.
 *
 * This is the first **server-paginated** list — `GET /api/users` takes
 * `page`/`pageSize`/`search`, unlike the entity lists, which return everything they
 * own. So search and paging state live in the query key, `keepPreviousData` holds the
 * old page on screen while the next loads, and the chips-over-loaded-rows pattern from
 * the other indexes does not apply.
 *
 * **Departures from the mock, all because the data does not exist:**
 * - No Status column — there is no active/inactive flag on `user`.
 * - No `+ Add User` — accounts are created by signing up (Better Auth); there is no
 *   admin create endpoint, and inventing a password-less account here would bypass
 *   the only registration path.
 * - Role renders the real chips (a user can be Admin *and* User), not one value.
 */

const PAGE_SIZES = [10, 25, 50];

const ROLE_TONES: Record<string, string> = {
	Admin: 'bg-accent/15 text-accent-bright',
	User: 'bg-surface-raised text-text-muted border border-border',
	Demo: 'bg-positive-bg text-positive'
};

function RoleChips({ roles }: { roles: number[] }) {
	const names = getRoleNames(roles);

	if (names.length === 0) {
		return <span className="text-[0.8125rem] text-text-faint">None</span>;
	}

	return (
		<span className="flex flex-wrap gap-1.5">
			{names.map((name) => (
				<span
					key={name}
					className={`rounded-full px-2.5 py-1 text-[0.6875rem] font-medium ${ROLE_TONES[name] ?? ''}`}
				>
					{name}
				</span>
			))}
		</span>
	);
}

function UserRow({ user }: { user: AdminUser }) {
	const navigate = useNavigate();

	return (
		<tr className="border-b border-border last:border-b-0">
			<td className="px-6 py-4">
				<span className="font-mono text-[0.75rem] text-text-faint" title={user.id}>
					{user.id.slice(0, 8)}
				</span>
			</td>
			<td className="px-6 py-4">
				<span className="flex items-center gap-3">
					<span
						aria-hidden
						className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-[0.8125rem] font-semibold text-text"
					>
						{initial(user)}
					</span>
					<span className="min-w-0">
						<Link
							to={`/users/${user.id}/edit`}
							className="block truncate text-[0.9375rem] font-medium text-text transition-opacity hover:opacity-80"
						>
							{user.name || user.email}
						</Link>
						<span className="block truncate text-[0.8125rem] text-text-muted">{user.email}</span>
					</span>
				</span>
			</td>
			<td className="px-6 py-4">
				<RoleChips roles={user.roles} />
			</td>
			<td className="px-6 py-4">
				<span className="flex justify-end">
					<IconButton
						label={`Edit ${user.name || user.email}`}
						onClick={() => navigate(`/users/${user.id}/edit`)}
					>
						<Pencil className="size-4" strokeWidth={1.75} aria-hidden />
					</IconButton>
				</span>
			</td>
		</tr>
	);
}

export function UsersPage() {
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [search, setSearchState] = useState('');

	const params = { page, pageSize, search: search.trim() };
	const { data, isPending, isError, error } = useQuery({
		queryKey: keys.users(params),
		queryFn: () => listUsers(params),
		placeholderData: keepPreviousData
	});

	/** A new search starts from page 1 — staying on page 4 of different results is noise. */
	const setSearch = (value: string) => {
		setSearchState(value);
		setPage(1);
	};

	const total = data?.total ?? 0;
	const lastPage = Math.max(1, Math.ceil(total / pageSize));
	const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
	const to = Math.min(page * pageSize, total);

	return (
		<>
			<div className="flex flex-wrap items-start justify-between gap-6">
				<div>
					<h1 className="display text-[clamp(2rem,4vw,2.75rem)]">Users</h1>
					<p className="mt-3 text-[0.9375rem] text-text-muted">Manage all users in the system.</p>
				</div>

				<SearchInput
					id="user-search"
					label="Search users"
					value={search}
					onChange={setSearch}
					placeholder="Search users…"
				/>
			</div>

			<div className="card mt-8 overflow-x-auto">
				{isPending || isError ? (
					<ListState pending={isPending} error={error} noun="users" />
				) : data && data.users.length === 0 ? (
					<ListEmpty
						icon={<Users className="size-5" strokeWidth={1.5} />}
						title={search ? 'Nothing matches that' : 'No users yet'}
						line={
							search ? 'Try a different email address.' : 'Accounts appear here as people sign up.'
						}
					/>
				) : (
					data && (
						<table className="w-full min-w-[36rem] text-left">
							<thead>
								<tr className="border-b border-border">
									{['ID', 'User', 'Role', ''].map((heading, index) => (
										<th
											key={index}
											scope="col"
											className="px-6 py-4 text-[0.6875rem] font-medium tracking-[0.12em] text-text-faint uppercase"
										>
											{heading}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{data.users.map((user) => (
									<UserRow key={user.id} user={user} />
								))}
							</tbody>
						</table>
					)
				)}

				{data && total > 0 && (
					<div className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-6 py-4">
						<p className="text-[0.8125rem] text-text-muted">
							Showing {from} to {to} of {total} {total === 1 ? 'user' : 'users'}
						</p>

						<div className="flex items-center gap-4">
							<nav aria-label="Pagination" className="flex items-center gap-2">
								<IconButton
									label="Previous page"
									onClick={() => setPage((p) => Math.max(1, p - 1))}
								>
									<ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden />
								</IconButton>
								<span className="px-1 text-[0.8125rem] text-text-muted tabular-nums">
									{page} / {lastPage}
								</span>
								<IconButton
									label="Next page"
									onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
								>
									<ChevronRight className="size-4" strokeWidth={1.75} aria-hidden />
								</IconButton>
							</nav>

							<label className="flex items-center gap-2 text-[0.8125rem] text-text-muted">
								Rows per page
								<select
									value={pageSize}
									onChange={(event) => {
										setPageSize(Number(event.target.value));
										setPage(1);
									}}
									className="rounded-control border border-border bg-surface-raised px-2 py-1.5 text-text focus:border-accent focus:outline-none"
								>
									{PAGE_SIZES.map((size) => (
										<option key={size} value={size}>
											{size}
										</option>
									))}
								</select>
							</label>
						</div>
					</div>
				)}
			</div>
		</>
	);
}
