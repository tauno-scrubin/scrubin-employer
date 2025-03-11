<script lang="ts">
	import { currentUser, scrubinClient } from "@/scrubinClient/client";
	import type { Candidate, AnalyzeResponse, Requirements } from "@/scrubinClient";
	import * as Card from "$lib/components/ui/card/index.js";
	import { ChevronRight, Loader2, Search, Sparkle, Star, Users } from "lucide-svelte";
	import Button from "@/components/ui/button/button.svelte";
	import WorkersResults from "@/components/dashboard/workersResults.svelte";
	import Input from "@/components/ui/input/input.svelte";
	import ChatWindow from "./chatWindow.svelte";
	import Textarea from "../ui/textarea/textarea.svelte";
	import { visible } from "./overlay";
	import { toast } from "svelte-sonner";
	import { slide } from "svelte/transition";
	import ShimmerButton from "../shimmerButton.svelte";
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import * as Tooltip from "$lib/components/ui/tooltip/index.js";

  

    let {
		redirect = false,
        onSearchWorkers = undefined,
        onSearchComplete = () => {},
        onNewSearch = () => {}
    }: {
		redirect?: boolean,
        onSearchWorkers?: (searchText: string) => void,
        onSearchComplete?: () => void,
        onNewSearch?: () => void
    } = $props();

	let searchText: string = $state("");
	let isLoading: boolean = $state(false);
	let workerLookupId: number | null = $state(null);
	let requirements: Requirements | null = $state(null);
	let inputFocused: boolean = $state(false);

	let healthcareWorkers: Candidate[] = $state([]);
	let totalItems: number = $state(0);
	let showResults: boolean = $state(false);
	let selectedWorkers: Record<string, boolean> = $state({});

    
  
	export async function searchWorkers(inputText?: string) {
		if (redirect) {
			goto("/dashboard/search?search=" + searchText);
			return
		}
	  const textToSearch = inputText || searchText;
	  if (!textToSearch.trim()) return;
	  visible.set(true);
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
		visible.set(false);
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

	let isLoadingNextStep: boolean = $state(false);

	async function nextStep() {
        if (workerLookupId) {
            try {
				const favoriteCandidateIds = Object.keys(selectedWorkers).filter(key => selectedWorkers[key]);
				if (favoriteCandidateIds.length === 0) {
					toast.error("Please select at least one candidate");
					return;
				}
                visible.set(true);
                isLoadingNextStep = true;
				
                const result = await scrubinClient.hunt.createJobRequirements(workerLookupId, favoriteCandidateIds);
				//goto(`/dashboard/hunts/requirements/${result.requirements.id}`);
                requirements = result;

            } catch (error) {
                toast.error("Error analyzing requirements: " + error);
                console.error("Error analyzing requirements:", error);
            } finally {
                visible.set(false);
                isLoadingNextStep = false;
            }
        }
    }
  
  </script>
  
  <div class="space-y-6">
	<!-- Search Input Card -->
	 {#if !requirements}
	<div class="mb-8 bg-blue-50 p-8 rounded-md group/search">
	  <div class="flex flex-col items-start gap-4 mb-2">
		<div class="text-blue-600">
		  <Sparkle fill="currentColor" class="w-6 h-6 rotate-45 group-hover/search:rotate-90 transition-all duration-200" />
		</div>
		<h1 class="text-3xl font-medium">Welcome back, {$currentUser?.firstName}!</h1>
	  </div>
	  
	  <div class="bg-white rounded-lg shadow-sm border p-4">
		<form on:submit|preventDefault={() => searchWorkers()} class="flex items-center flex-col relative group">
		  <Textarea
			bind:value={searchText} 
			maxlength={200}
			onfocus={() => inputFocused = true}
			onblur={() => !searchText && (inputFocused = false)}
			placeholder="I am looking for two General Practitioners from the UK with MRCGP qualifications who speak English. The salary for a full-time position is $300,000 per year."
			class="flex-1 p-0 shadow-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 resize-none" />
			
			{#if inputFocused}
		  <div transition:slide={{ delay: 100, duration: 200 }} class="flex items-end justify-between gap-2 w-full">
			<span class="text-xs text-gray-400">{searchText.length}/200</span>
			<div class="flex items-center gap-2">
			<Button type="submit" variant="default" class="transition-all duration-200 rounded-full w-10 h-10 p-0 bg-blue-600 hover:bg-blue-700">
			  {#if isLoading}
				<Loader2 class="w-5 h-5 animate-spin" />
			  {:else}
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				  <path d="M22 2L11 13"></path>
				  <path d="M22 2l-7 20-4-9-9-4 20-7z"></path>
				</svg>
			  {/if}
			</Button>
			</div>
		  </div>
		  {/if}
		</form>
	  </div>

	  {#if healthcareWorkers.length > 0 && !isLoading}
	  <div class="w-full  bg-white rounded-lg shadow-sm border overflow-hidden  mt-4">
		<div class="flex flex-col sm:flex-row items-center justify-between w-full">
		  <div class="flex-1 p-5 flex items-center gap-4 border-b sm:border-b-0 sm:border-r w-full sm:w-auto">
			<div class="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
			  <Users class="w-5 h-5  text-blue-600" />
			</div>
			<div class="flex flex-col">
			  <div class="flex items-baseline gap-2">
				<span class="text-2xl font-bold text-blue-600">{totalItems}</span>
				<span class="text-sm font-medium text-gray-600">Results found</span>
			  </div>
			  <span class="text-xs text-gray-500">Total matching candidates</span>
			</div>
		  </div>
		  
		  {#if healthcareWorkers.length > 0}
		  <div class="p-5 w-full sm:w-auto">
			<Tooltip.Provider delayDuration={100} disabled={$currentUser?.status != "pending"}>
				<Tooltip.Root>
				  <Tooltip.Trigger>
			<Button
			onclick={nextStep} 
			disabled={isLoadingNextStep || $currentUser?.status == "pending"}
			>
			{#if isLoadingNextStep}
			<Loader2 class="w-4 h-4 mr-2 animate-spin" />
			Processing...
		  {:else}
			Next step
			<ChevronRight class="w-4 h-4 ml-2" />
		  {/if}
			</Button>
		</Tooltip.Trigger>
		<Tooltip.Content>
		  <p>Activate your account to continue</p>
		</Tooltip.Content>
	</Tooltip.Root>
  </Tooltip.Provider>
		  </div>
		  {/if}
		</div>
	  </div>
	  {/if}
	  

	</div>
  
	<!-- Results Card (shown when a search has been performed) -->
	{#if healthcareWorkers}
	  <WorkersResults 
		bind:selectedWorkers={selectedWorkers}
		bind:healthcareWorkers={healthcareWorkers}
		bind:workerLookupId={workerLookupId}
		bind:totalItems={totalItems}
		bind:isSearching={isLoading}
		bind:showResults={showResults}
		bind:searchString={searchText}
		bind:requirements={requirements}
	  />
	{/if}

	{#if healthcareWorkers.length === 0 && !isLoading && showResults}
		<div class="flex flex-col items-center justify-center p-8 bg-white rounded-lg border shadow-sm mt-4">
			<div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
				<Search class="w-6 h-6 text-gray-400" />
			</div>
			<h3 class="text-lg font-medium text-gray-900 mb-2">No matches found</h3>
			<p class="text-sm text-gray-500 text-center max-w-md mb-4">
				We couldn't find any healthcare workers matching your criteria. Try adjusting your search parameters or broadening your requirements.
			</p>
		</div>
	  {/if}
	<!-- Requirements exist -->
	{:else}
		<ChatWindow bind:requirements={requirements} />
	{/if}
  </div>
  