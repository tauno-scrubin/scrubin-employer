<script lang="ts">
	import SEO from "$lib/components/SEO.svelte";
	import SearchView from "@/components/dashboard/searchView.svelte";
	import * as Card from "$lib/components/ui/card/index.js";
	import { scrubinClient } from '@/scrubinClient/client';
	import type { WorkerLookup } from '@/scrubinClient';
	import { Loader2, RotateCcw } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import Button from "$lib/components/ui/button/button.svelte";

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
  
<div class="space-y-2">

	<!-- Search View -->
	<SearchView 
		bind:this={searchViewComponent} 
		onSearchComplete={handleSearchComplete}
		onNewSearch={handleNewSearch}
	/>


	{#if !isSearchActive}
		<!-- Search History -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Search History</Card.Title>
			</Card.Header>
			<Card.Content>
				{#if isLoading}
					<div class="flex justify-center p-4">
						<Loader2 class="h-6 w-6 animate-spin" />
					</div>
				{:else if searchHistory.length === 0}
					<p class="text-center text-muted-foreground">No search history found</p>
				{:else}
					<div class="space-y-4">
						{#each searchHistory as lookup}
							<div class="flex items-center justify-between rounded-lg border p-4">
								<div class="space-y-1">
									<p class="font-medium">{lookup.userInput}</p>
									<p class="text-sm text-muted-foreground">
										{formatDate(lookup.createdAt)}
									</p>
								</div>
								<Button
									size="sm"
									onclick={() => handleRerunSearch(lookup.userInput)}
								>
									<RotateCcw class="w-4 h-4" />
									Rerun Search
								</Button>
							</div>
						{/each}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}

	
</div>
