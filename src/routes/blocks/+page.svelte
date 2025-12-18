<script lang="ts">
	import { Avatar, Menu, Portal } from '@skeletonlabs/skeleton-svelte';
	import { ThemeToggle } from '$lib/components/ui/theme-toggle';
	import head from '$lib/assets/head.png';
	import logo from '$lib/assets/logo.png';
	import { page } from '$app/stores';

	const user = $derived($page.data.user);

	const team = [
		{
			name: 'Sarah Chen',
			role: 'CEO & Co-Founder',
			bio: 'Former design lead at Figma. Passionate about making design systems accessible to everyone.',
			image: null,
			color: 'preset-filled-primary-500'
		},
		{
			name: 'Marcus Rivera',
			role: 'CTO & Co-Founder',
			bio: 'Ex-Google engineer with 15 years of experience building scalable frontend architectures.',
			image: null,
			color: 'preset-filled-secondary-500'
		},
		{
			name: 'Emily Nakamura',
			role: 'Head of Design',
			bio: 'Award-winning designer focused on creating delightful user experiences.',
			image: null,
			color: 'preset-filled-tertiary-500'
		},
		{
			name: 'David Okonkwo',
			role: 'Lead Engineer',
			bio: 'Open source enthusiast and Svelte core contributor. Loves building developer tools.',
			image: null,
			color: 'preset-filled-success-500'
		},
		{
			name: 'Lisa Park',
			role: 'Developer Advocate',
			bio: 'Community builder and educator. Helps developers succeed with modern web technologies.',
			image: null,
			color: 'preset-filled-warning-500'
		},
		{
			name: 'James Mitchell',
			role: 'Product Manager',
			bio: 'Bridges the gap between user needs and technical solutions. Data-driven decision maker.',
			image: null,
			color: 'preset-filled-error-500'
		}
	];

	const values = [
		{
			icon: 'M13 10V3L4 14h7v7l9-11h-7z',
			title: 'Ship Fast',
			description: 'We believe in rapid iteration. Launch early, gather feedback, and improve continuously.'
		},
		{
			icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
			title: 'User First',
			description: 'Every decision starts with the user. We obsess over creating exceptional experiences.'
		},
		{
			icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
			title: 'Community Driven',
			description: 'Open source is in our DNA. We build with the community, for the community.'
		},
		{
			icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
			title: 'Quality Matters',
			description: 'We never compromise on quality. Every pixel, every line of code is crafted with care.'
		}
	];

	const milestones = [
		{ year: '2021', title: 'The Beginning', description: 'Skeleton was born as a side project to simplify Tailwind development.' },
		{ year: '2022', title: 'Open Source Launch', description: 'Released v1.0 to the public. Reached 1,000 GitHub stars in the first month.' },
		{ year: '2023', title: 'Community Growth', description: 'Surpassed 10,000 GitHub stars. Launched Skeleton 2.0 with major improvements.' },
		{ year: '2024', title: 'Enterprise Ready', description: 'Introduced enterprise features and professional support plans.' },
		{ year: '2025', title: 'The Future', description: 'Expanding to new frameworks and building the next generation of design tools.' }
	];

	const stats = [
		{ value: '50K+', label: 'GitHub Stars' },
		{ value: '100K+', label: 'Weekly Downloads' },
		{ value: '500+', label: 'Contributors' },
		{ value: '50+', label: 'Countries' }
	];
</script>

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
						<a href="/blocks" class="text-primary-500 font-medium">Blocks</a>
						<a href="/charts" class="text-surface-600 dark:text-surface-400 hover:text-primary-500 font-medium transition-colors">Charts</a>
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

	<!-- Hero Section -->
	<section class="relative overflow-hidden">
		<div class="absolute inset-0 bg-gradient-to-br from-secondary-500/10 via-transparent to-primary-500/10"></div>
		<div class="absolute top-40 right-20 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl"></div>
		<div class="absolute bottom-20 left-20 w-72 h-72 bg-secondary-500/10 rounded-full blur-3xl"></div>

		<div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
			<div class="max-w-3xl mx-auto text-center">
				<span class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary-500/10 text-secondary-600 dark:text-secondary-400 text-sm font-medium mb-6">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
					</svg>
					Meet the Team
				</span>

				<h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
					<span class="text-transparent bg-clip-text bg-gradient-to-r from-secondary-500 to-primary-500">
						We're building the future of design systems
					</span>
				</h1>

				<p class="text-xl text-surface-600 dark:text-surface-400 mb-8 leading-relaxed">
					A passionate team of designers, engineers, and dreamers united by a single mission:
					making beautiful, accessible interfaces achievable for everyone.
				</p>
			</div>
		</div>
	</section>

	<!-- Stats Section -->
	<section class="py-16 border-y border-surface-200 dark:border-surface-800 bg-surface-100/50 dark:bg-surface-800/30">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="grid grid-cols-2 md:grid-cols-4 gap-8">
				{#each stats as stat}
					<div class="text-center">
						<p class="text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-secondary-500">{stat.value}</p>
						<p class="text-surface-600 dark:text-surface-400 mt-2 font-medium">{stat.label}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Mission Section -->
	<section class="py-24 px-4 sm:px-6 lg:px-8">
		<div class="max-w-7xl mx-auto">
			<div class="grid lg:grid-cols-2 gap-16 items-center">
				<div>
					<span class="text-primary-500 font-semibold text-sm uppercase tracking-wider">Our Mission</span>
					<h2 class="text-3xl sm:text-4xl font-bold text-black dark:text-white mt-4 mb-6">
						Democratizing great design
					</h2>
					<p class="text-lg text-surface-600 dark:text-surface-400 mb-6 leading-relaxed">
						We believe that every developer should have access to professional-grade design tools.
						Not everyone has a design team, but everyone deserves a beautiful product.
					</p>
					<p class="text-lg text-surface-600 dark:text-surface-400 leading-relaxed">
						Skeleton bridges the gap between design and development, providing the building blocks
						that empower teams of any size to create stunning, accessible user interfaces without
						compromising on quality or performance.
					</p>
				</div>
				<div class="relative">
					<div class="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-3xl blur-2xl opacity-20"></div>
					<div class="relative bg-white dark:bg-surface-800 rounded-3xl p-8 shadow-2xl">
						<div class="grid grid-cols-2 gap-4">
							<div class="aspect-square rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
								<svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
								</svg>
							</div>
							<div class="aspect-square rounded-2xl bg-gradient-to-br from-secondary-500 to-secondary-600 flex items-center justify-center">
								<svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
								</svg>
							</div>
							<div class="aspect-square rounded-2xl bg-gradient-to-br from-tertiary-500 to-tertiary-600 flex items-center justify-center">
								<svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/>
								</svg>
							</div>
							<div class="aspect-square rounded-2xl bg-gradient-to-br from-success-500 to-success-600 flex items-center justify-center">
								<svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
								</svg>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Values Section -->
	<section class="py-24 px-4 sm:px-6 lg:px-8 bg-surface-100 dark:bg-surface-800/50">
		<div class="max-w-7xl mx-auto">
			<div class="text-center mb-16">
				<span class="text-secondary-500 font-semibold text-sm uppercase tracking-wider">Our Values</span>
				<h2 class="text-3xl sm:text-4xl font-bold text-black dark:text-white mt-4 mb-4">
					What drives us forward
				</h2>
				<p class="text-lg text-surface-600 dark:text-surface-400 max-w-2xl mx-auto">
					These core principles guide every decision we make and every feature we build.
				</p>
			</div>

			<div class="grid md:grid-cols-2 gap-8">
				{#each values as value, i}
					<div class="group relative bg-white dark:bg-surface-800 rounded-2xl p-8 shadow-xl shadow-surface-900/5 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
						<div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
						<div class="flex gap-6">
							<div class="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500/20 to-secondary-500/20 flex items-center justify-center">
								<svg class="w-7 h-7 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={value.icon}/>
								</svg>
							</div>
							<div>
								<h3 class="text-xl font-bold text-black dark:text-white mb-2">{value.title}</h3>
								<p class="text-surface-600 dark:text-surface-400 leading-relaxed">{value.description}</p>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Team Section -->
	<section class="py-24 px-4 sm:px-6 lg:px-8">
		<div class="max-w-7xl mx-auto">
			<div class="text-center mb-16">
				<span class="text-primary-500 font-semibold text-sm uppercase tracking-wider">The Team</span>
				<h2 class="text-3xl sm:text-4xl font-bold text-black dark:text-white mt-4 mb-4">
					Meet the people behind Skeleton
				</h2>
				<p class="text-lg text-surface-600 dark:text-surface-400 max-w-2xl mx-auto">
					A diverse team of talented individuals passionate about building great developer tools.
				</p>
			</div>

			<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
				{#each team as member}
					<div class="group bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5 hover:shadow-2xl transition-all duration-300">
						<div class="flex flex-col items-center text-center">
							<div class="relative mb-4">
								<div class="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full blur-lg opacity-0 group-hover:opacity-50 transition-opacity"></div>
								<div class="relative w-24 h-24">
									<Avatar name={member.name} class="{member.color} w-24 h-24 text-2xl" />
								</div>
							</div>
							<h3 class="text-xl font-bold text-black dark:text-white">{member.name}</h3>
							<p class="text-primary-500 font-medium text-sm mb-3">{member.role}</p>
							<p class="text-surface-600 dark:text-surface-400 text-sm leading-relaxed">{member.bio}</p>
							<div class="flex gap-3 mt-4">
								<a href="#" class="p-2 rounded-lg bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 transition-colors" aria-label="Twitter">
									<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
								</a>
								<a href="#" class="p-2 rounded-lg bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 transition-colors" aria-label="LinkedIn">
									<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
								</a>
								<a href="#" class="p-2 rounded-lg bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 transition-colors" aria-label="GitHub">
									<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
								</a>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Timeline Section -->
	<section class="py-24 px-4 sm:px-6 lg:px-8 bg-surface-100 dark:bg-surface-800/50">
		<div class="max-w-4xl mx-auto">
			<div class="text-center mb-16">
				<span class="text-tertiary-500 font-semibold text-sm uppercase tracking-wider">Our Journey</span>
				<h2 class="text-3xl sm:text-4xl font-bold text-black dark:text-white mt-4 mb-4">
					From idea to impact
				</h2>
				<p class="text-lg text-surface-600 dark:text-surface-400">
					A timeline of milestones that shaped who we are today.
				</p>
			</div>

			<div class="relative">
				<!-- Timeline line -->
				<div class="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-500 via-secondary-500 to-tertiary-500"></div>

				<div class="space-y-12">
					{#each milestones as milestone, i}
						<div class="relative flex items-center {i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}">
							<!-- Timeline dot -->
							<div class="absolute left-8 md:left-1/2 w-4 h-4 -ml-2 rounded-full bg-white dark:bg-surface-900 border-4 border-primary-500 z-10"></div>

							<!-- Content -->
							<div class="ml-20 md:ml-0 md:w-1/2 {i % 2 === 0 ? 'md:pr-16' : 'md:pl-16'}">
								<div class="bg-white dark:bg-surface-800 rounded-2xl p-6 shadow-xl shadow-surface-900/5">
									<span class="inline-block px-3 py-1 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 text-sm font-bold mb-3">
										{milestone.year}
									</span>
									<h3 class="text-xl font-bold text-black dark:text-white mb-2">{milestone.title}</h3>
									<p class="text-surface-600 dark:text-surface-400">{milestone.description}</p>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<!-- CTA Section -->
	<section class="py-24 px-4 sm:px-6 lg:px-8">
		<div class="max-w-4xl mx-auto">
			<div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-600 to-secondary-600 p-12 text-center">
				<div class="absolute inset-0 opacity-10">
					<div class="absolute inset-0" style="background-image: url(&quot;data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E&quot;);"></div>
				</div>
				<div class="relative">
					<h2 class="text-3xl sm:text-4xl font-bold text-white mb-4">
						Want to join our team?
					</h2>
					<p class="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
						We're always looking for talented individuals who share our passion for building great tools.
					</p>
					<div class="flex flex-col sm:flex-row gap-4 justify-center">
						<a href="#" class="btn px-8 py-3 rounded-lg font-semibold bg-white text-primary-600 hover:bg-surface-100 shadow-lg transition-all">
							View Open Positions
						</a>
						<a href="/" class="btn px-8 py-3 rounded-lg font-semibold bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all">
							Back to Home
						</a>
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
