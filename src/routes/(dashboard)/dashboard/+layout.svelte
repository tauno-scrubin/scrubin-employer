<script lang="ts">
	import { Separator } from "$lib/components/ui/separator";
	import AppSidebar from "@/components/app-sidebar.svelte";
	import AnalyzingOverlay from "@/components/dashboard/analyzingOverlay.svelte";
	import * as Breadcrumb from "@/components/ui/breadcrumb";
	import * as Sidebar from "@/components/ui/sidebar";
	import { Toaster } from "@/components/ui/sonner";
	import { currentUser } from "@/scrubinClient/client.js";
	import { ModeWatcher, setMode, setTheme } from "mode-watcher";


    let { data } = $props();

    currentUser.set(data.user);

	setMode("light")

</script>
<ModeWatcher />
<Toaster />
<AnalyzingOverlay/>
<Sidebar.Provider>
	<AppSidebar user={data.user} />
	<Sidebar.Inset>
		<header class="flex h-16 shrink-0 items-center gap-2">
			<div class="flex items-center gap-2 px-4">
				<Sidebar.Trigger class="-ml-1" />
				<Separator orientation="vertical" class="mr-2 h-4" />
				
			</div>
		</header>
		<div class="flex flex-1 flex-col gap-4 p-4 pt-0">
			<slot />
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
