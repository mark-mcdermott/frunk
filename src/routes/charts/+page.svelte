<script lang="ts">
	import { Avatar, Switch, SegmentedControl, Menu, Portal } from '@skeletonlabs/skeleton-svelte';
	import { ThemeToggle } from '$lib/components/ui/theme-toggle';
	import head from '$lib/assets/head.png';
	import logo from '$lib/assets/logo.png';
	import { page } from '$app/stores';

	const user = $derived($page.data.user);

	// State for interactive components
	let notifyDoNotDisturb = $state(false);
	let notifyGlobal = $state(true);
	let notifyPersonal = $state(true);
	let notifyPriority = $state(false);
	let notifyNews = $state(false);

	let deliveryOption = $state('tomorrow');
	let selectedSize = $state('6');
	let musicProgress = $state(35);

	// Team members data
	const teamMembers = [
		{ name: 'Janet Rosenbell', email: 'jrosenbell@email.com', initials: 'JR', color: 'preset-filled-primary-500' },
		{ name: 'Jason Greene', email: 'jgreene@email.com', initials: 'JG', color: 'preset-filled-secondary-500' },
		{ name: 'Lucas Gamble', email: 'lgamble@email.com', initials: 'LG', color: 'preset-filled-tertiary-500' },
		{ name: 'Murray Henderson', email: 'mhenderson@email.com', initials: 'MH', color: 'preset-filled-success-500' }
	];

	// Stats data
	const stats = [
		{ value: '64k+', label: 'Downloads', change: '+4%', positive: true },
		{ value: '93k+', label: 'Views', change: '+2.4%', positive: true },
		{ value: '15k+', label: 'Members', change: '+8%', positive: true }
	];

	// Revenue data
	const revenue = [
		{ amount: '$3,900', percent: 95, change: '+20%', positive: true },
		{ amount: '$6,400', percent: 75, change: '-5%', positive: false },
		{ amount: '$1,300', percent: 40, change: '+8%', positive: true }
	];

	const sizes = ['5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10'];
</script>

<svelte:head>
	<title>Charts - Frunk</title>
</svelte:head>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900">
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
						<a href="/blocks" class="text-surface-600 dark:text-surface-400 hover:text-primary-500 font-medium transition-colors">Blocks</a>
						<a href="/charts" class="text-primary-500 font-medium">Charts</a>
						<a href="/content" class="text-surface-600 dark:text-surface-400 hover:text-primary-500 font-medium transition-colors">Content</a>
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
								<Avatar class="w-8 h-8 border border-[#ddd]">
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
											<Menu.ItemText>Profile</Menu.ItemText>
										</Menu.Item>
										<Menu.Item value="settings" class="px-3 py-2 rounded hover:bg-surface-100 dark:hover:bg-surface-700 cursor-pointer outline-none">
											<Menu.ItemText>Settings</Menu.ItemText>
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

	<!-- Showcase Section -->
	<section id="showcase" class="py-20 px-4 sm:px-6 lg:px-8">
		<div class="max-w-7xl mx-auto">
			<div class="text-center mb-16">
				<h2 class="text-3xl sm:text-4xl font-bold text-black dark:text-white mb-4">
					Charts
				</h2>
				<p class="text-lg text-surface-600 dark:text-surface-400 max-w-2xl mx-auto">
					Explore our collection of pre-built chart components.
				</p>
			</div>

			<!-- Bento Grid -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-fr">

				<!-- Create Account Card -->
				<div class="lg:col-span-1 bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5">
					<h3 class="text-xl font-bold text-black dark:text-white mb-2">Create Account</h3>
					<p class="text-sm text-surface-500 mb-6">Complete the form to get started.</p>

					<div class="flex gap-3 mb-4">
						<button class="flex-1 btn preset-outlined-surface-500 py-2 rounded-lg text-sm font-medium">GitHub</button>
						<button class="flex-1 btn preset-outlined-surface-500 py-2 rounded-lg text-sm font-medium">Google</button>
					</div>

					<div class="space-y-4">
						<div>
							<label for="email-input" class="text-xs font-medium text-surface-600 dark:text-surface-400 block mb-1">Email</label>
							<input id="email-input" type="email" placeholder="me@example.com" class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500" />
						</div>
						<div>
							<label for="password-input" class="text-xs font-medium text-surface-600 dark:text-surface-400 block mb-1">Password</label>
							<input id="password-input" type="password" placeholder="Enter your password..." class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm focus:ring-2 focus:ring-primary-500" />
						</div>
						<button class="w-full btn preset-filled-primary-500 py-2.5 rounded-lg font-semibold text-white">
							Create Account
						</button>
					</div>
				</div>

				<!-- Notifications Card -->
				<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5">
					<h3 class="text-xl font-bold text-black dark:text-white mb-2">Notifications</h3>
					<p class="text-sm text-surface-500 mb-6">Review each available option.</p>

					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<span class="text-sm text-surface-700 dark:text-surface-300">Do Not Disturb</span>
							<Switch name="dnd" bind:checked={notifyDoNotDisturb} />
						</div>
						<div class="flex items-center justify-between">
							<span class="text-sm text-surface-700 dark:text-surface-300">Global</span>
							<Switch name="global" bind:checked={notifyGlobal} />
						</div>
						<div class="flex items-center justify-between">
							<span class="text-sm text-surface-700 dark:text-surface-300">Personal</span>
							<Switch name="personal" bind:checked={notifyPersonal} />
						</div>
						<div class="flex items-center justify-between">
							<span class="text-sm text-surface-700 dark:text-surface-300">Priority</span>
							<Switch name="priority" bind:checked={notifyPriority} />
						</div>
						<div class="flex items-center justify-between">
							<span class="text-sm text-surface-700 dark:text-surface-300">News</span>
							<Switch name="news" bind:checked={notifyNews} />
						</div>
					</div>
				</div>

				<!-- Team Card -->
				<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5">
					<h3 class="text-xl font-bold text-black dark:text-white mb-2">Team</h3>
					<p class="text-sm text-surface-500 mb-4">View all members of the team.</p>

					<input type="text" placeholder="Search Members..." class="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-700 border-0 text-sm mb-4 focus:ring-2 focus:ring-primary-500" />

					<div class="space-y-3">
						{#each teamMembers as member}
							<div class="flex items-center gap-3">
								<Avatar name={member.name} class={member.color} />
								<div class="min-w-0">
									<p class="text-sm font-medium text-black dark:text-white truncate">{member.name}</p>
									<p class="text-xs text-surface-500 truncate">{member.email}</p>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- Music Player Card -->
				<div class="lg:row-span-2 bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5 flex flex-col">
					<div class="flex items-center justify-between mb-4">
						<span class="text-xl font-bold text-black dark:text-white">Music</span>
						<span class="text-xs text-surface-500">Harman Kardon Luna</span>
					</div>

					<!-- Album Art -->
					<div class="relative flex-1 min-h-[200px] rounded-xl overflow-hidden mb-4 bg-gradient-to-br from-primary-600 to-secondary-600">
						<div class="absolute inset-0 flex items-center justify-center">
							<div class="text-center text-white">
								<p class="text-xs uppercase tracking-wider opacity-75">Massive Attack</p>
								<p class="text-2xl font-bold">MEZZANINE</p>
							</div>
						</div>
					</div>

					<!-- Progress -->
					<div class="mb-4">
						<div class="flex items-center gap-3">
							<svg class="w-4 h-4 text-surface-400" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
							<div class="flex-1 h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
								<div class="h-full bg-primary-500 rounded-full" style="width: {musicProgress}%"></div>
							</div>
							<span class="text-xs text-surface-400 tabular-nums">{Math.floor(musicProgress / 100 * 4)}:12</span>
						</div>
					</div>

					<!-- Controls -->
					<div class="grid grid-cols-4 gap-2">
						<button aria-label="Normalize" class="aspect-square rounded-xl bg-surface-100 dark:bg-surface-700 flex items-center justify-center hover:bg-surface-200 dark:hover:bg-surface-600 transition-colors">
							<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v18M3 12h18"/></svg>
						</button>
						<button aria-label="Equalizer" class="aspect-square rounded-xl bg-surface-100 dark:bg-surface-700 flex items-center justify-center hover:bg-surface-200 dark:hover:bg-surface-600 transition-colors">
							<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
						</button>
						<button aria-label="3D Audio" class="aspect-square rounded-xl bg-surface-100 dark:bg-surface-700 flex items-center justify-center hover:bg-surface-200 dark:hover:bg-surface-600 transition-colors">
							<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M6 15H2v-6h4l5-5v16l-5-5z"/></svg>
						</button>
						<button aria-label="Crossfade" class="aspect-square rounded-xl bg-surface-100 dark:bg-surface-700 flex items-center justify-center hover:bg-surface-200 dark:hover:bg-surface-600 transition-colors">
							<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
						</button>
					</div>
				</div>

				<!-- Success Alert -->
				<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<div class="w-10 h-10 rounded-full bg-success-500/20 flex items-center justify-center">
								<svg class="w-5 h-5 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
								</svg>
							</div>
							<div>
								<p class="font-bold text-black dark:text-white">Success</p>
								<p class="text-sm text-surface-500">Task was completed.</p>
							</div>
						</div>
						<button class="btn preset-outlined-surface-500 px-3 py-1.5 rounded-lg text-sm">Dismiss</button>
					</div>
				</div>

				<!-- Statistics Card -->
				<div class="lg:col-span-2 bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5">
					<h3 class="text-xl font-bold text-black dark:text-white mb-6">Statistics</h3>

					<div class="grid grid-cols-3 gap-6 mb-6">
						{#each stats as stat}
							<div class="text-center">
								<p class="text-3xl font-bold text-black dark:text-white">{stat.value}</p>
								<p class="text-sm text-surface-500">{stat.label}</p>
								<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-2 {stat.positive ? 'bg-success-500/20 text-success-600' : 'bg-error-500/20 text-error-600'}">
									{stat.change}
								</span>
							</div>
						{/each}
					</div>

					<p class="text-xs text-surface-500">Data represents quarterly metrics for the TPS reports. Updates every 24 hours.</p>
				</div>

				<!-- Circular Progress -->
				<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5">
					<h3 class="text-xl font-bold text-black dark:text-white mb-4 text-center">Progression</h3>

					<div class="relative w-32 h-32 mx-auto">
						<svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
							<circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" stroke-width="8" class="text-surface-200 dark:text-surface-700"/>
							<circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" stroke-width="8" stroke-dasharray="251.2" stroke-dashoffset="170.8" class="text-primary-500"/>
						</svg>
						<div class="absolute inset-0 flex items-center justify-center">
							<span class="text-2xl font-bold text-black dark:text-white">32%</span>
						</div>
					</div>

					<div class="flex justify-center gap-4 mt-4 text-xs text-surface-500">
						<span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-primary-500"></span> 66%</span>
						<span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-surface-300"></span> 35%</span>
					</div>
				</div>

				<!-- Delivery Options -->
				<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5">
					<h3 class="text-lg font-bold text-black dark:text-white mb-4">Delivery</h3>

					<SegmentedControl name="delivery" bind:value={deliveryOption}>
						{#snippet children()}
							<SegmentedControl.Item value="tomorrow">Tomorrow</SegmentedControl.Item>
							<SegmentedControl.Item value="2days">Within 2 days</SegmentedControl.Item>
						{/snippet}
					</SegmentedControl>

					<h3 class="text-lg font-bold text-black dark:text-white mt-6 mb-4">Size</h3>
					<div class="grid grid-cols-5 gap-2">
						{#each sizes as size}
							<button
								class="py-2 rounded-lg text-sm font-medium transition-all {selectedSize === size ? 'bg-primary-500 text-white' : 'bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600'}"
								onclick={() => selectedSize = size}
							>
								{size}
							</button>
						{/each}
					</div>
				</div>

				<!-- Revenue Card -->
				<div class="lg:col-span-2 bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5">
					<div class="flex items-center justify-between mb-6">
						<div>
							<h3 class="text-xl font-bold text-black dark:text-white">Revenue</h3>
							<p class="text-sm text-surface-500">Period: April 1-13</p>
						</div>
						<button aria-label="Open in new window" class="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
							</svg>
						</button>
					</div>

					<div class="space-y-4">
						{#each revenue as item}
							<div class="flex items-center gap-4">
								<span class="text-lg font-bold text-black dark:text-white w-20">{item.amount}</span>
								<div class="flex-1 h-3 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
									<div class="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full transition-all" style="width: {item.percent}%"></div>
								</div>
								<span class="text-xs font-medium px-2 py-1 rounded-full {item.positive ? 'bg-success-500/20 text-success-600' : 'bg-error-500/20 text-error-600'}">
									{item.change}
								</span>
							</div>
						{/each}
					</div>
				</div>

			</div>
		</div>
	</section>

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
