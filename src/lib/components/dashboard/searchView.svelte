<script lang="ts">
	import { scrubinClient } from "@/scrubinClient/client";
	import type { Candidate, AnalyzeResponse, Requirements } from "@/scrubinClient";
	import * as Card from "$lib/components/ui/card/index.js";
	import { Loader2 } from "lucide-svelte";
	import Button from "@/components/ui/button/button.svelte";
	import WorkersResults from "@/components/dashboard/workersResults.svelte";
	import Input from "@/components/ui/input/input.svelte";
	import ChatWindow from "./chatWindow.svelte";
  

    let {
        onSearchWorkers = undefined,
        onSearchComplete = () => {},
        onNewSearch = () => {}
    }: {
        onSearchWorkers?: (searchText: string) => void,
        onSearchComplete?: () => void,
        onNewSearch?: () => void
    } = $props();

	let searchText: string = $state("");
	let isLoading: boolean = $state(false);
	let workerLookupId: number | null = $state(null);
	let requirements: Requirements | null = $state(null);

	let healthcareWorkers: Candidate[] = $state([]);
	let totalItems: number = $state(0);
	let showResults: boolean = $state(false);

    
  
	export async function searchWorkers(inputText?: string) {
	  const textToSearch = inputText || searchText;
	  if (!textToSearch.trim()) return;
	  
	  isLoading = true;
	  showResults = false;
	  try {
		if (inputText) {
		  searchText = inputText;
		}
		
		const result = await scrubinClient.hunt.analyzeWorkerLookups(textToSearch);
		healthcareWorkers = result.examplesCandidates;
		workerLookupId = result.workerLookupId;
		totalItems = result.totalCandidates;
		showResults = true;
		onSearchComplete();
	  } catch (error) {
		console.error("Error searching workers:", error);
	  } finally {
		isLoading = false;
	  }
	}

	function handleNewSearch() {
	  healthcareWorkers = [];
	  showResults = false;
	  requirements = null;
	  searchText = "";
	  onNewSearch();
	}
  
  </script>
  
  <div class="space-y-6">
	<!-- Search Input Card -->
	 {#if !requirements}
	<Card.Root>
	  <Card.Header>
		<Card.Title>Worker Search</Card.Title>
	  </Card.Header>
	  <Card.Content>
		<form on:submit|preventDefault={() => searchWorkers()} class="flex space-x-4">
			<Input
				type="text" 
				bind:value={searchText} 
				placeholder="Enter job description or keywords..."
				class="flex-1 rounded border border-gray-300 p-2" />
			<Button type="submit" variant="default" class="whitespace-nowrap">
			{#if isLoading}
			  <Loader2 class="w-4 h-4 animate-spin" />
			{:else}
			  Search Workers
			{/if}
		  </Button>
		</form>
	  </Card.Content>
	</Card.Root>
  
	<!-- Results Card (shown when a search has been performed) -->
	{#if healthcareWorkers}
	  <WorkersResults 
		bind:healthcareWorkers={healthcareWorkers}
		bind:workerLookupId={workerLookupId}
		bind:totalItems={totalItems}
		bind:isSearching={isLoading}
		bind:showResults={showResults}
		bind:searchString={searchText}
		bind:requirements={requirements}
	  />
	{/if}
	<!-- Requirements exist -->
	{:else}
		<ChatWindow bind:requirements={requirements} />
	{/if}
  </div>
  