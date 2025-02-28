<script lang="ts">
	import ChatWindow from "@/components/dashboard/chatWindow.svelte";
	import type { Requirements } from "@/scrubinClient";

	let {
		data
	} : {
		data: {
			requirements: Requirements
		}
	} = $props();

	console.log(data);

</script>
<div class="space-y-2 max-w-screen-xl mx-auto w-full">
<ChatWindow requirements={data.requirements} />
</div>