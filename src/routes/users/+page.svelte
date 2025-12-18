<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { ThemeToggle } from '$lib/components/ui/theme-toggle';
	import { Avatar, Menu, Pagination, Portal } from '@skeletonlabs/skeleton-svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import head from '$lib/assets/head.png';
	import logo from '$lib/assets/logo.png';
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
	<!-- Navigation -->
	<nav class="sticky top-0 z-50 bg-surface-50/80 dark:bg-surface-900/80 backdrop-blur-lg border-b border-surface-200 dark:border-surface-800">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between h-16">
				<div class="flex items-center gap-8">
					<!-- Logo -->
					<a href="/" class="flex items-center gap-2" aria-label="Home">
						<img src={head} alt="Logo" class="h-16 w-auto" />
					</a>
					<!-- Nav Links -->
					<div class="hidden md:flex items-center gap-6">
						<Menu>
							<Menu.Trigger class="cursor-pointer outline-none text-surface-600 dark:text-surface-400 hover:text-primary-500 font-medium transition-colors flex items-center gap-1">
								Style
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
							</Menu.Trigger>
							<Portal>
								<Menu.Positioner>
									<Menu.Content class="bg-white dark:bg-surface-800 rounded-lg shadow-xl border border-[#ddd] dark:border-surface-700 p-1 min-w-[140px]">
										<Menu.Item value="blocks" class="px-3 py-2 rounded hover:bg-surface-100 dark:hover:bg-surface-700 cursor-pointer outline-none">
											<a href="/blocks" class="w-full block outline-none">Blocks</a>
										</Menu.Item>
										<Menu.Item value="charts" class="px-3 py-2 rounded hover:bg-surface-100 dark:hover:bg-surface-700 cursor-pointer outline-none">
											<a href="/charts" class="w-full block outline-none">Charts</a>
										</Menu.Item>
										<Menu.Item value="content" class="px-3 py-2 rounded hover:bg-surface-100 dark:hover:bg-surface-700 cursor-pointer outline-none">
											<a href="/content" class="w-full block outline-none">Content</a>
										</Menu.Item>
									</Menu.Content>
								</Menu.Positioner>
							</Portal>
						</Menu>
						{#if user?.admin}
							<a href="/users" class="text-primary-500 font-medium">Users</a>
						{/if}
					</div>
				</div>
				<div class="flex items-center gap-4">
					<!-- GitHub -->
					<a href="https://github.com/mark-mcdermott/frunk" class="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors" aria-label="GitHub">
						<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
					</a>
					<!-- Theme Toggle -->
					<ThemeToggle mode="light-dark-system" />
					<!-- Sign In / Sign Out -->
					{#if user}
						<Menu>
							<Menu.Trigger class="cursor-pointer outline-none">
								<Avatar class="w-8 h-8 border border-[#ccc] ml-2">
									{#if user.avatar}
										<Avatar.Image src={user.avatar} alt="Avatar" class="rounded-full object-cover" />
									{:else}
										<Avatar.Fallback class="preset-filled-primary-500 rounded-full text-sm">{user.username?.charAt(0).toUpperCase()}</Avatar.Fallback>
									{/if}
								</Avatar>
							</Menu.Trigger>
							<Portal class="!z-[9999]">
								<Menu.Positioner class="!z-[9999]">
									<Menu.Content class="bg-white dark:bg-surface-800 rounded-lg shadow-xl border border-[#ddd] dark:border-surface-700 p-1 min-w-[160px]">
										<Menu.Item value="profile" class="px-3 py-2 rounded hover:bg-surface-100 dark:hover:bg-surface-700 cursor-pointer outline-none">
											<a href="/users/{user.uuid}" class="w-full block outline-none">Profile</a>
										</Menu.Item>
										<Menu.Item value="settings" class="px-3 py-2 rounded hover:bg-surface-100 dark:hover:bg-surface-700 cursor-pointer outline-none">
											<a href="/users/{user.uuid}/edit" class="w-full block outline-none">Settings</a>
										</Menu.Item>
										<Menu.Separator class="my-1 border-t border-surface-200 dark:border-surface-700" />
										<Menu.Item value="signout" class="px-3 py-2 rounded hover:bg-surface-100 dark:hover:bg-surface-700 cursor-pointer outline-none">
											<form action="/sign-out" method="POST" class="w-full">
												<button type="submit" class="w-full text-left text-red-500 outline-none">Sign Out</button>
											</form>
										</Menu.Item>
									</Menu.Content>
								</Menu.Positioner>
							</Portal>
						</Menu>
					{:else}
						<a href="/sign-in" class="btn btn-sm preset-filled-primary-500">Sign In</a>
					{/if}
				</div>
			</div>
		</div>
	</nav>

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
							<th class="text-right py-4 px-6 text-xs font-semibold text-surface-500 uppercase tracking-wider">Actions</th>
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
											<form method="POST" action="?/delete" use:enhance={({ cancel }) => {
												if (!confirm('Are you sure you want to delete this user?')) {
													cancel();
												}
											}}>
												<input type="hidden" name="userId" value={u.uuid} />
												<button type="submit" class="text-red-500 hover:text-red-600 transition-colors relative top-[2px]" aria-label="Delete user">
													<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
													</svg>
												</button>
											</form>
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

	<!-- Footer -->
	<footer class="border-t border-surface-200 dark:border-surface-800 py-12 px-4 sm:px-6 lg:px-8">
		<div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
			<div class="flex items-center gap-2">
				<img src={logo} alt="Logo" class="h-12 w-auto" />
			</div>
			<p class="text-sm text-surface-500 flex items-center gap-1">Built with <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"/></svg> by <a href="https://markmcdermott.io" class="text-primary-500 hover:text-[#93c5fd] transition-colors">Mark McDermott</a></p>
		</div>
	</footer>
</div>
