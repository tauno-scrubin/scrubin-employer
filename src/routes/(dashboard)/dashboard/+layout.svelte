<script lang="ts">
	import { Separator } from "$lib/components/ui/separator";
	import AppSidebar from "@/components/app-sidebar.svelte";
	import AnalyzingOverlay from "@/components/dashboard/analyzingOverlay.svelte";
	import * as Breadcrumb from "@/components/ui/breadcrumb";
	import * as Sidebar from "@/components/ui/sidebar";
	import { Toaster } from "@/components/ui/sonner";
	import { currentUser, currentUserCompany } from "@/scrubinClient/client.js";
	import { ModeWatcher, setMode, setTheme } from "mode-watcher";


    let { data } = $props();

    currentUser.set(data.user);
	currentUserCompany.set(data.company);
	setMode("light")

</script>
<!-- {#if data.user.isDemoUser}
<div class="fixed top-0 left-0 w-full h-full bg-black/50 z-50">
	<div class="flex items-center justify-center h-full">
		<div class="text-white text-2xl">
			Demo User
		</div>
	</div>
</div>
{/if} -->

<ModeWatcher />
<Toaster />
<AnalyzingOverlay/>
<Sidebar.Provider>
	<AppSidebar user={data.user} />
	<Sidebar.Inset>
		<header class="flex h-16 shrink-0 items-center gap-2">
			<div class="flex items-center gap-2 px-4">
				<Sidebar.Trigger class="-ml-1" />
				
			</div>
		</header>
		<div class="flex flex-1 flex-col gap-4 p-4 pt-0">
			<slot />
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
