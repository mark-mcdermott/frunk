<script lang="ts">
	import { ThemeToggle } from '$lib/components/ui/theme-toggle';
	import { Avatar, Menu, Portal } from '@skeletonlabs/skeleton-svelte';
	import head from '$lib/assets/head.png';
	import { page } from '$app/stores';

	const user = $derived($page.data.user);
	const hasNotes = $derived($page.data.hasNotes);
	const hasRepairs = $derived($page.data.hasRepairs);
</script>

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
					<a href="/store" class="text-surface-600 dark:text-surface-400 hover:text-primary-500 font-medium transition-colors">Merch</a>
					{#if user}
						<a href="/vehicles" class="text-surface-600 dark:text-surface-400 hover:text-primary-500 font-medium transition-colors">Vehicles</a>
						<a href="/vendors" class="text-surface-600 dark:text-surface-400 hover:text-primary-500 font-medium transition-colors">Vendors</a>
					{/if}
					{#if hasNotes}
						<a href="/notes" class="text-surface-600 dark:text-surface-400 hover:text-primary-500 font-medium transition-colors">Notes</a>
					{/if}
					{#if hasRepairs}
						<a href="/repairs" class="text-surface-600 dark:text-surface-400 hover:text-primary-500 font-medium transition-colors">Repairs</a>
					{/if}
					{#if user?.admin}
						<a href="/users" class="text-surface-600 dark:text-surface-400 hover:text-primary-500 font-medium transition-colors">Users</a>
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
					<a href="/sign-in" class="btn btn-sm preset-filled-primary-500 pt-[3px] pb-[5px] border-2 border-[#93c5fd] rounded-lg">Sign In</a>
				{/if}
			</div>
		</div>
	</div>
</nav>
