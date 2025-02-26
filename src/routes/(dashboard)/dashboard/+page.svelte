<script lang="ts">
	import SEO from "$lib/components/SEO.svelte";
	import SearchView from "@/components/dashboard/searchView.svelte";
	import * as Card from "$lib/components/ui/card/index.js";
	import { scrubinClient } from '@/scrubinClient/client';
	import type { WorkerLookup } from '@/scrubinClient';
	import { Loader2, RotateCcw } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import Button from "$lib/components/ui/button/button.svelte";
	import AnalyzingOverlay from "@/components/dashboard/analyzingOverlay.svelte";
	import SearchHistory from "@/components/dashboard/searchHistory.svelte";
	import * as Tabs from "$lib/components/ui/tabs/index.js";
	import HuntsList from "@/components/dashboard/huntsList.svelte";

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

	function handleRerunSearch(searchText: string) {
		searchViewComponent.searchWorkers(searchText);
		isSearchActive = true;
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
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

	let selectedTab = $state('hunts');
</script>
  
<SEO 
	title="Worker Search | Admin Dashboard"
	description="Search and analyze worker candidates based on job descriptions and requirements."
	keywords="worker search, candidates, admin dashboard, sveltekit"
	image="/images/workers-search.jpg"
	type="website"
	canonicalUrl="https://yourwebsite.com/worker-search" />

<AnalyzingOverlay/>
  
<div class="space-y-2 max-w-screen-xl mx-auto w-full">

	<!-- Search View -->
	<SearchView 
		bind:this={searchViewComponent} 
		onSearchComplete={handleSearchComplete}
		onNewSearch={handleNewSearch}
	/>


	{#if !isSearchActive}
	<Tabs.Root value={selectedTab} class="w-full">
		<Tabs.List class="grid w-fit grid-cols-2 ">
		  <Tabs.Trigger value="hunts">Hunts</Tabs.Trigger>
		  <Tabs.Trigger value="history">History</Tabs.Trigger>
		</Tabs.List>
		<Tabs.Content value="hunts">
		  <HuntsList/>
		</Tabs.Content>
		<Tabs.Content value="history">
			<SearchHistory onSearchWorkers={handleRerunSearch}/>
		</Tabs.Content>
	  </Tabs.Root>
		
	{/if}

	
</div>
