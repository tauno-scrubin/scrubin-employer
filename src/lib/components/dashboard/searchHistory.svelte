<script lang="ts">
	import { scrubinClient } from '@/scrubinClient/client';
	import type { WorkerLookup } from '@/scrubinClient';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Loader2, ArrowRight, Clock, Search, History } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import Button from '../ui/button/button.svelte';
	import { goto } from '$app/navigation';
	import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";



	let isLoading = $state(false);
	let searchHistory: WorkerLookup[] = $state([]);
	let displayLimit = $state(10);
	let hasMoreItems = $derived(searchHistory.length > displayLimit);

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

	function showMoreItems() {
		displayLimit = searchHistory.length;
	}

	function handleRerunSearch(searchText: string) {
		goto("/dashboard/search?search=" + searchText);
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function formatTime(dateString: string) {
		return new Date(dateString).toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	onMount(() => {
		loadSearchHistory();
	});
</script>
<h2 class="text-2xl font-medium text-gray-800 mb-4">Recent Searches</h2>

		{#if isLoading}
			<div class="flex justify-center items-center h-40">
				<Loader2 class="h-5 w-5 animate-spin text-primary/70" />
			</div>
		{:else if searchHistory.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-center">
				<div class="bg-blue-50/50 p-3 rounded-full mb-3">
					<Search class="h-5 w-5 text-primary/60" />
				</div>
				<p class="text-sm font-medium text-gray-600">No recent searches</p>
				<p class="text-xs text-gray-400 mt-1 max-w-[200px]">Your search history will appear here</p>
			</div>
		{:else}
		<ScrollArea class="h-[600px]">
			<div class="divide-y">
				{#each searchHistory.slice(0, displayLimit) as lookup}
					<div class="hover:bg-blue-50/30 transition-colors duration-200">
						<button 
							class="w-full text-left px-4 pl-0 py-3 focus:outline-none focus:bg-blue-50/50"
							onclick={() => handleRerunSearch(lookup.userInput)}
						>
							<div class="flex flex-col">
								<p class="font-medium text-sm text-gray-800 line-clamp-2">{lookup.userInput}</p>
								<div class="flex items-center gap-2 mt-1.5">
									<span class="text-xs text-gray-400 flex items-center">
										<Clock class="w-3 h-3 mr-1 inline" />
										{formatDate(lookup.createdAt)} at {formatTime(lookup.createdAt)}
									</span>
									<span class="text-xs text-primary font-medium flex items-center ml-auto">
										Run again
										<ArrowRight class="w-3 h-3 ml-1" />
									</span>
								</div>
							</div>
						</button>
					</div>
				{/each}
				
				{#if hasMoreItems}
					<div class="pt-3 pb-2">
						<Button 
							variant="ghost" 
							class="w-full text-primary text-sm font-medium"
							onclick={showMoreItems}
						>
							Show more ({searchHistory.length - displayLimit} remaining)
						</Button>
					</div>
				{/if}
			</div>
		</ScrollArea>
		{/if}

