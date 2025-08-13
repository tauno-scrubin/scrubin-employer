<script lang="ts">
	import { goto } from '$app/navigation';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { t } from '$lib/i18n';
	import type { WorkerLookup } from '@/scrubinClient';
	import { scrubinClient } from '@/scrubinClient/client';
	import { ArrowRight, Clock, Loader2, Search } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import Button from '../ui/button/button.svelte';
	import { visible } from '@/components/dashboard/overlay';

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

	async function handleRerunSearch(searchText: string) {
		try {
			isLoading = true;
			visible.set(true);
			const result = await scrubinClient.hunt.requirementsChat({
				message: searchText
			});

			goto(`/dashboard/hunts/requirements/${result.jobRequirementId}`);
		} catch (error) {
			console.error('Error searching requirements:', error);
		} finally {
			visible.set(false);
			isLoading = false;
		}
		
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

<h2 class="mb-4 text-2xl font-medium text-gray-800">{$t('dashboard.searchHistory.title')}</h2>

{#if isLoading}
	<div class="flex h-40 items-center justify-center">
		<Loader2 class="h-5 w-5 animate-spin text-primary/70" />
	</div>
{:else if searchHistory.length === 0}
	<div class="flex flex-col items-center justify-center py-12 text-center">
		<div class="mb-3 rounded-full bg-blue-50/50 p-3">
			<Search class="h-5 w-5 text-primary/60" />
		</div>
		<p class="text-sm font-medium text-gray-600">{$t('dashboard.searchHistory.noHistory')}</p>
		<p class="mt-1 max-w-[200px] text-xs text-gray-400">
			{$t('dashboard.searchHistory.noHistoryDesc')}
		</p>
	</div>
{:else}
	<ScrollArea class="h-[600px]">
		<div class="divide-y">
			{#each searchHistory.slice(0, displayLimit) as lookup}
				<div class="transition-colors duration-200 hover:bg-blue-50/30">
					<button
						class="w-full px-4 py-3 pl-0 text-left focus:bg-blue-50/50 focus:outline-none"
						onclick={() => handleRerunSearch(lookup.userInput)}
					>
						<div class="flex flex-col">
							<p class="line-clamp-2 text-sm font-medium text-gray-800">{lookup.userInput}</p>
							<div class="mt-1.5 flex items-center gap-2">
								<span class="flex items-center text-xs text-gray-400">
									<Clock class="mr-1 inline h-3 w-3" />
									{formatDate(lookup.createdAt)} at {formatTime(lookup.createdAt)}
								</span>
								<span class="ml-auto flex items-center text-xs font-medium text-primary">
									{$t('dashboard.searchHistory.runAgain')}
									<ArrowRight class="ml-1 h-3 w-3" />
								</span>
							</div>
						</div>
					</button>
				</div>
			{/each}

			{#if hasMoreItems}
				<div class="pb-2 pt-3">
					<Button
						variant="ghost"
						class="w-full text-sm font-medium text-primary"
						onclick={showMoreItems}
					>
						{$t('dashboard.searchHistory.showMore')} ({searchHistory.length - displayLimit}
						{$t('dashboard.searchHistory.remaining')})
					</Button>
				</div>
			{/if}
		</div>
	</ScrollArea>
{/if}
