<script lang="ts">
	import BookOpen from "lucide-svelte/icons/book-open";
	import Bot from "lucide-svelte/icons/bot";
	import ChartPie from "lucide-svelte/icons/chart-pie";
	import Frame from "lucide-svelte/icons/frame";
	import LifeBuoy from "lucide-svelte/icons/life-buoy";
	import Map from "lucide-svelte/icons/map";
	import Send from "lucide-svelte/icons/send";
	import Settings2 from "lucide-svelte/icons/settings-2";
	import SquareTerminal from "lucide-svelte/icons/square-terminal";
	import NavMain from "$lib/components/nav-main.svelte";
	import NavProjects from "$lib/components/nav-projects.svelte";
	import NavSecondary from "$lib/components/nav-secondary.svelte";
	import NavUser from "$lib/components/nav-user.svelte";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import Command from "lucide-svelte/icons/command";
	import { onMount, type ComponentProps } from "svelte";
	import type { PortalUser } from "@/scrubinClient";
	import { page } from "$app/stores";
	import { currentUser } from "@/scrubinClient/client";
	import scrubin from "$lib/scrubin-new.json";
	import Scrubinsvg from "@/scrubinsvg.svelte";
	import { Calendar } from "lucide-svelte";

	let { ref = $bindable(null), user, ...restProps }: ComponentProps<typeof Sidebar.Root> & { user: PortalUser } = $props();

		const data = $derived({
		user: {
			name: $currentUser?.firstName,
			email: $currentUser?.email,
			avatar: "/avatars/shadcn.jpg",
		},
		navMain: [
			{
				title: "Dashboard",
				url: "/dashboard",
				isActive: $page.url.pathname.includes("/dashboard/playground") || $page.url.pathname == "/dashboard",
				icon: SquareTerminal,
	
			},
			{
				title: "Settings",
				url: "/dashboard/settings",
				icon: Settings2,
				isActive: $page.url.href.includes("/settings"),
			},
		],
		navSecondary: [
		
		],
		projects: [
			
		],
		})


		
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



</script>

<Sidebar.Root bind:ref variant="inset" {...restProps}>
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton size="lg">
					{#snippet child({ props })}
						<a href="/dashboard" {...props}>
							<div bind:this={logoRef} class="h-6 w-[8.5rem]  -ml-4 -translate-y-[0.2rem]">
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
		<NavSecondary items={data.navSecondary} class="mt-auto" />
		{#if $currentUser?.status == "pending"}
		<div class="px-4 py-3 mx-2 mb-4 rounded-lg bg-gradient-to-b from-yellow-100 via-yellow-100 shadow-inner shadow-yellow-50 to-yellow-50 border border-yellow-200">
			<h4 class="text-sm font-medium text-yellow-800 mb-1">Account Pending Activation</h4>
			<p class="text-xs text-yellow-600 mb-2">Schedule a quick call with our team to activate your account.</p>
			<a
				href="https://calendar.app.google/VN4kA74b4Xjn6tHN7"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-2 text-xs font-medium bg-yellow-200 px-2 py-1 rounded-md text-yellow-800 hover:bg-yellow-300 transition-colors"
			>
				<Calendar class="h-3 w-3" />
				Schedule Call
			</a>
		</div>
		{/if}

	</Sidebar.Content>
	<Sidebar.Footer>
		<NavUser user={data.user} />
	</Sidebar.Footer>
</Sidebar.Root>
