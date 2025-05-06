<script lang="ts">
	import { page } from '$app/stores';
	import NavMain from '$lib/components/nav-main.svelte';
	import NavUser from '$lib/components/nav-user.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { t } from '$lib/i18n';
	import scrubin from '$lib/scrubin-new.json';
	import type { PortalUser } from '@/scrubinClient';
	import { currentUser } from '@/scrubinClient/client';
	import Scrubinsvg from '@/scrubinsvg.svelte';
	import { Calendar, HelpCircle } from 'lucide-svelte';
	import ChartPie from 'lucide-svelte/icons/chart-pie';
	import Settings2 from 'lucide-svelte/icons/settings-2';
	import SquareTerminal from 'lucide-svelte/icons/square-terminal';
	import { onMount, type ComponentProps } from 'svelte';
	import HelpDialog from './dashboard/helpDialog.svelte';
	import Button from './ui/button/button.svelte';

	let {
		ref = $bindable(null),
		user,
		...restProps
	}: ComponentProps<typeof Sidebar.Root> & { user: PortalUser } = $props();

	const data = $derived({
		user: {
			name: $currentUser?.firstName || 'User',
			email: $currentUser?.email || 'user@example.com',
			avatar: null
		},
		navMain: [
			{
				title: $t('nav.dashboard'),
				url: '/dashboard',
				isActive:
					$page.url.pathname.includes('/dashboard/playground') ||
					$page.url.pathname == '/dashboard',
				icon: SquareTerminal
			},
			{
				title: $t('nav.settings'),
				url: '/dashboard/settings',
				icon: Settings2,
				isActive: $page.url.href.includes('/settings')
			},
			{
				title: $t('nav.pricing'),
				url: '/dashboard/pricing',
				icon: ChartPie,
				isActive: $page.url.href.includes('/pricing')
			}
		],
		projects: []
	});

	let logoRef: HTMLDivElement;
	let lottieLoaded = $state(false);

	onMount(async () => {
		const lottieModule = await import('lottie-web');
		const lottie = lottieModule.default;
		const animation = lottie.loadAnimation({
			container: logoRef,
			renderer: 'canvas',
			loop: false,
			autoplay: false,
			animationData: scrubin
		});

		lottieLoaded = true;

		setTimeout(() => {
			animation.play();
		}, 500);
	});

	let openHelpDialog = $state(false);
</script>

<HelpDialog bind:open={openHelpDialog} />

<Sidebar.Root bind:ref variant="inset" {...restProps}>
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton size="lg">
					{#snippet child({ props })}
						<a href="/dashboard" {...props}>
							<div bind:this={logoRef} class="-ml-4 h-6 w-[8.5rem] -translate-y-[0.2rem]">
								{#if !lottieLoaded}
									<Scrubinsvg class="h-[1.5rem] pl-3.5" onlyS={true} />
								{/if}
							</div>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		<NavMain items={data.navMain} />
		{#if $currentUser?.status == 'pending'}
			<div
				class="mx-2 mb-4 rounded-lg border border-yellow-200 bg-gradient-to-b from-yellow-100 via-yellow-100 to-yellow-50 px-4 py-3 shadow-inner shadow-yellow-50"
			>
				<h4 class="mb-1 text-sm font-medium text-yellow-800">{$t('account.pendingActivation')}</h4>
				<p class="mb-2 text-xs text-yellow-600">
					{$t('account.scheduleCall')}
				</p>
				<a
					href="https://calendar.app.google/VN4kA74b4Xjn6tHN7"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-2 rounded-md bg-yellow-200 px-2 py-1 text-xs font-medium text-yellow-800 transition-colors hover:bg-yellow-300"
				>
					<Calendar class="h-3 w-3" />
					{$t('account.scheduleCallBtn')}
				</a>
			</div>
		{/if}
	</Sidebar.Content>
	<Sidebar.Footer>		
		<Button
			variant="ghost"
			size="sm"
			class="justify-start text-start"
			onclick={() => {
				openHelpDialog = true;
			}}
		>
			<HelpCircle />
			{$t('nav.help')}
		</Button>
		<NavUser user={data.user} />
	</Sidebar.Footer>
</Sidebar.Root>
