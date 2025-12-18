<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { Avatar, Pagination } from '@skeletonlabs/skeleton-svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { page } from '$app/stores';

	const user = $derived($page.data.user);
	const users = $derived($page.data.users);
	const currentPage = $derived($page.data.page);
	const pageSize = $derived($page.data.pageSize);
	const total = $derived($page.data.total);
	const sortBy = $derived($page.data.sortBy);
	const sortOrder = $derived($page.data.sortOrder);
	const search = $derived($page.data.search);

	let searchInput = $state('');
	let debounceTimer: ReturnType<typeof setTimeout>;

	// Delete confirmation modal state
	let deleteModalOpen = $state(false);
	let userToDelete = $state<{ uuid: string; username: string } | null>(null);
	let deleteFormEl: HTMLFormElement | null = null;

	$effect(() => {
		searchInput = search || '';
	});

	function buildUrl(params: { page?: number; sortBy?: string; sortOrder?: string; search?: string }) {
		const p = params.page ?? currentPage;
		const sb = params.sortBy ?? sortBy;
		const so = params.sortOrder ?? sortOrder;
		const s = params.search ?? search;
		let url = `/users?page=${p}&pageSize=${pageSize}&sortBy=${sb}&sortOrder=${so}`;
		if (s) url += `&search=${encodeURIComponent(s)}`;
		return url;
	}

	function handlePageChange(event: { page: number }) {
		goto(buildUrl({ page: event.page }));
	}

	function handleSort(column: string) {
		const newOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
		goto(buildUrl({ page: 1, sortBy: column, sortOrder: newOrder }));
	}

	function handleSearch(value: string) {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			goto(buildUrl({ page: 1, search: value }));
		}, 300);
	}
</script>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900 flex flex-col">
	<Navbar />

	<!-- Main Content -->
	<main class="flex-1 px-4 sm:px-6 lg:px-8 py-12">
		<div class="max-w-4xl mx-auto">
			<Breadcrumbs items={[{ label: 'Users' }]} />
			<div class="mb-8 flex items-end justify-between">
				<div>
					<h1 class="text-2xl font-bold text-black dark:text-white">Users</h1>
					<p class="text-sm text-surface-500 mt-1">Manage all users in the system.</p>
				</div>
				<div class="relative">
					<svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
					</svg>
					<input
						type="text"
						placeholder="Search users..."
						bind:value={searchInput}
						oninput={(e) => handleSearch(e.currentTarget.value)}
						class="pl-9 pr-4 py-2 rounded-lg bg-white dark:bg-surface-800 border border-[#ddd] dark:border-surface-700 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64"
					/>
				</div>
			</div>

			<div class="bg-white dark:bg-surface-800 rounded-2xl shadow-xl shadow-surface-900/5 border border-[#eee] overflow-hidden">
				<table class="w-full">
					<thead>
						<tr class="border-b border-surface-200 dark:border-surface-700">
							<th class="text-left py-4 px-6 text-xs font-semibold text-surface-500 uppercase tracking-wider">
								<button onclick={() => handleSort('id')} class="flex items-center gap-1 hover:text-surface-700 dark:hover:text-surface-300 transition-colors">
									ID
									{#if sortBy === 'id'}
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											{#if sortOrder === 'asc'}
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
											{:else}
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
											{/if}
										</svg>
									{/if}
								</button>
							</th>
							<th class="text-left py-4 px-6 text-xs font-semibold text-surface-500 uppercase tracking-wider">
								<button onclick={() => handleSort('username')} class="flex items-center gap-1 hover:text-surface-700 dark:hover:text-surface-300 transition-colors">
									User
									{#if sortBy === 'username'}
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											{#if sortOrder === 'asc'}
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
											{:else}
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
											{/if}
										</svg>
									{/if}
								</button>
							</th>
							<th class="text-center py-4 px-6 text-xs font-semibold text-surface-500 uppercase tracking-wider">
								<button onclick={() => handleSort('admin')} class="flex items-center gap-1 justify-center w-full hover:text-surface-700 dark:hover:text-surface-300 transition-colors">
									Role
									{#if sortBy === 'admin'}
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											{#if sortOrder === 'asc'}
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
											{:else}
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
											{/if}
										</svg>
									{/if}
								</button>
							</th>
							<th class="text-right py-4 px-6 text-xs font-semibold text-surface-500 tracking-wider">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-surface-100 dark:divide-surface-700">
						{#each users as u}
							<tr class="hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors cursor-pointer" onclick={(e) => { if (e.target.closest('a, button, form')) return; goto(`/users/${u.uuid}/edit`); }}>
								<td class="py-4 px-6">
									<span class="text-sm text-surface-500">{u.id}</span>
								</td>
								<td class="py-4 px-6">
									<div class="flex items-center gap-3">
										<Avatar class="w-10 h-10 border border-[#ddd]">
											{#if u.avatar}
												<Avatar.Image src={u.avatar} alt="Avatar" class="rounded-full object-cover" />
											{:else}
												<Avatar.Fallback class="preset-filled-primary-500 rounded-full text-sm">{u.username?.charAt(0).toUpperCase()}</Avatar.Fallback>
											{/if}
										</Avatar>
										<div>
											<p class="text-sm font-medium text-black dark:text-white">{u.username}</p>
										</div>
									</div>
								</td>
								<td class="py-4 px-6 text-center">
									{#if u.admin}
										<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-500/10 text-primary-600 dark:text-primary-400">
											Admin
										</span>
									{:else}
										<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-500/10 text-surface-600 dark:text-surface-400">
											User
										</span>
									{/if}
								</td>
								<td class="py-4 px-6 text-right">
									<div class="flex items-center justify-end gap-3">
										<a href="/users/{u.uuid}/edit" class="text-primary-500 hover:text-primary-600 transition-colors" aria-label="Edit user">
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
											</svg>
										</a>
										{#if u.uuid !== user?.uuid}
											<form
												method="POST"
												action="?/delete"
												use:enhance
												bind:this={deleteFormEl}
												class="hidden"
												id="delete-form-{u.uuid}"
											>
												<input type="hidden" name="userId" value={u.uuid} />
											</form>
											<button
												type="button"
												class="text-red-500 hover:text-red-600 transition-colors relative top-[2px]"
												aria-label="Delete user"
												onclick={() => {
													userToDelete = { uuid: u.uuid, username: u.username };
													deleteModalOpen = true;
												}}
											>
												<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
												</svg>
											</button>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			{#if total > pageSize}
				<div class="mt-6 flex justify-center">
					<Pagination count={total} pageSize={pageSize} page={currentPage} onPageChange={handlePageChange} siblingCount={1} class="inline-flex items-center bg-white dark:bg-surface-800 border border-[#ddd] dark:border-surface-700 rounded-xl overflow-hidden">
						<Pagination.PrevTrigger class="px-3 py-2 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
						</Pagination.PrevTrigger>
						<Pagination.Context>
							{#snippet children(pagination)}
								{#each pagination().pages as p, index (p)}
									{#if p.type === 'page'}
										<Pagination.Item {...p} class="px-3 py-2 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors data-[selected]:bg-primary-500 data-[selected]:text-white">
											{p.value}
										</Pagination.Item>
									{:else}
										<Pagination.Ellipsis {index} class="px-2 py-2 text-surface-500">...</Pagination.Ellipsis>
									{/if}
								{/each}
							{/snippet}
						</Pagination.Context>
						<Pagination.NextTrigger class="px-3 py-2 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
						</Pagination.NextTrigger>
					</Pagination>
				</div>
			{/if}
		</div>
	</main>

	<Footer />
</div>

<!-- Delete Confirmation Modal -->
<ConfirmModal
	open={deleteModalOpen}
	title="Delete User"
	message={userToDelete ? `Are you sure you want to delete ${userToDelete.username}? This action cannot be undone.` : ''}
	confirmText="Delete"
	onConfirm={() => {
		if (userToDelete) {
			const form = document.getElementById(`delete-form-${userToDelete.uuid}`) as HTMLFormElement;
			form?.requestSubmit();
		}
		deleteModalOpen = false;
		userToDelete = null;
	}}
	onCancel={() => {
		deleteModalOpen = false;
		userToDelete = null;
	}}
/>
