<script lang="ts">
	import SEO from '$lib/components/SEO.svelte';
	import HuntsList from "@/components/dashboard/huntsList.svelte";
	import SearchHistory from "@/components/dashboard/searchHistory.svelte";
	import SearchView from "@/components/dashboard/searchView.svelte";
	import type { WorkerLookup } from '@/scrubinClient';
	import { scrubinClient } from '@/scrubinClient/client';
	import { onMount } from 'svelte';

	let searchViewComponent: SearchView;
	let isLoading = $state(false);
	let searchHistory: WorkerLookup[] = $state([]);
	let isSearchActive = $state(false);

	async function loadSearchHistory() {
		isLoading = true;
		try {
			const history = await scrubinClient.hunt.getWorkerLookups();
			searchHistory = history.items;
		} catch (error) {
			console.error('Error loading search history:', error);
		} finally {
			isLoading = false;
		}
	}

	function handleSearchComplete() {
		isSearchActive = true;
	}

	function handleNewSearch() {
		isSearchActive = false;
	}

	onMount(() => {
		loadSearchHistory();
	});

</script>

<SEO
	title='Employer | Scrubin'
	description=''
	type="website"
/>
  
<div class="space-y-2 max-w-screen-xl mx-auto w-full">

	<!-- Search View -->
	<SearchView 
		redirect={true}
		bind:this={searchViewComponent} 
		onSearchComplete={handleSearchComplete}
		onNewSearch={handleNewSearch}
	/>


	{#if !isSearchActive}
	<div class="grid grid-cols-6 gap-4">
		<div class="col-span-4">
			<HuntsList/>
		</div>
		
		<div class="col-span-2 border-l pl-4 border-opacity-50">
			
			<SearchHistory/>
		</div>
	</div>
	{/if}

	
</div>
