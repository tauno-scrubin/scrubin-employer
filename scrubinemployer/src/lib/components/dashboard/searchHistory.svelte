<script lang="ts">
	import { scrubinClient } from '@/scrubinClient/client';
	import type { WorkerLookup } from '@/scrubinClient';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Loader2, RotateCcw } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import Button from '../ui/button/button.svelte';


    let {
        onSearchWorkers
    }: {
        onSearchWorkers: (searchText: string) => void
    } = $props();

	let isLoading = $state(false);
	let searchHistory: WorkerLookup[] = $state([]);

	async function loadSearchHistory() {
		isLoading = true;
		try {
			const history = await scrubinClient.hunt.getWorkerLookups();
            console.log(history);
			searchHistory = history.items;
		} catch (error) {
			console.error('Error loading search history:', error);
		} finally {
			isLoading = false;
		}
	}

	function handleRerunSearch(searchText: string) {
        onSearchWorkers(searchText);
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

	onMount(() => {
		loadSearchHistory();
	});
</script>

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
