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
	import Separator from "@/components/ui/separator/separator.svelte";

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

</script>
  
<SEO 
	title="Worker Search | Admin Dashboard"
	description="Search and analyze worker candidates based on job descriptions and requirements."
	keywords="worker search, candidates, admin dashboard, sveltekit"
	image="/images/workers-search.jpg"
	type="website"
	canonicalUrl="https://yourwebsite.com/worker-search" />


  
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
