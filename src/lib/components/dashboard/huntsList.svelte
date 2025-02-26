<script lang="ts">
	import { scrubinClient } from '@/scrubinClient/client';
	import type { Hunt } from '@/scrubinClient';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Loader2, ArrowRight, Clock, Search, History } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import Button from '../ui/button/button.svelte';
	import { goto } from '$app/navigation';

    let {
        onViewHunt
    }: {
        onViewHunt: (huntId: number) => void
    } = $props();

	let isLoading = $state(false);
	let hunts: Hunt[] = $state([]);

	async function loadHunts() {
		isLoading = true;
		try {
			const response = await scrubinClient.hunt.getHunts();
            console.log(response);
			hunts = response.items;
		} catch (error) {
			console.error('Error loading hunts:', error);
		} finally {
			isLoading = false;
		}
	}

	function handleViewHunt(huntId: number) {
        goto(`/dashboard/hunts/${huntId}`);
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
		loadHunts();
	});
</script>

<Card.Root class="bg-white shadow-sm border h-fit">
	<Card.Header class="pb-4 pt-4 pl-3.5 border-b">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<Card.Title class="text-base font-medium">Active Hunts</Card.Title>
			</div>
		</div>
	</Card.Header>
	<Card.Content class="p-0">
		{#if isLoading}
			<div class="flex justify-center items-center h-40">
				<Loader2 class="h-5 w-5 animate-spin text-primary/70" />
			</div>
		{:else if hunts.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-center">
				<div class="bg-blue-50/50 p-3 rounded-full mb-3">
					<Search class="h-5 w-5 text-primary/60" />
				</div>
				<p class="text-sm font-medium text-gray-600">No active hunts</p>
				<p class="text-xs text-gray-400 mt-1 max-w-[200px]">Your hunts will appear here</p>
			</div>
		{:else}
			<div class="divide-y">
				{#each hunts as hunt}
					<div class="hover:bg-blue-50/30 transition-colors duration-200">
						<a href={`/dashboard/hunts/${hunt.huntId}`} 
							class="flex w-full text-left px-4 py-3 focus:outline-none focus:bg-blue-50/50"
						>
							<div class="flex flex-col">
								<p class="font-medium text-sm text-gray-800 line-clamp-2">{hunt.title}</p>
								<div class="flex items-center gap-2 mt-1.5 w-full">
									<span class="text-xs text-gray-400 flex items-center">
										<Clock class="w-3 h-3 mr-1 inline" />
										{formatDate(hunt.dateActivated)} at {formatTime(hunt.dateActivated)}
									</span>
									<span class="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
										{hunt.status}
									</span>
								</div>
							</div>
						</a>
					</div>
				{/each}
			</div>
		{/if}
	</Card.Content>
</Card.Root>
