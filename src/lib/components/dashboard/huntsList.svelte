<script lang="ts">
	import { scrubinClient } from '@/scrubinClient/client';
	import type { Hunt } from '@/scrubinClient';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Loader2, ArrowRight, Clock, Search, History, Sparkle } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import Button from '../ui/button/button.svelte';
	import { goto } from '$app/navigation';
	import { formatStatus, getStatusColor } from '../payment/payments';

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


<h2 class="text-2xl font-medium text-gray-800 mb-4">Headhunting</h2>
<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
	{#if isLoading}
		<div class="col-span-full flex justify-center items-center h-40">
			<Loader2 class="h-5 w-5 animate-spin text-primary/70" />
		</div>
	{:else if hunts.length === 0}
		<div class="col-span-full flex flex-col items-center justify-center py-12 text-center">
			<div class="bg-blue-50/50 p-3 rounded-full mb-3">
				<Search class="h-5 w-5 text-primary/60" />
			</div>
			<p class="text-sm font-medium text-gray-600">No active hunts</p>
			<p class="text-xs text-gray-400 mt-1 max-w-[200px]">Your hunts will appear here</p>
		</div>
	{:else}
		{#each hunts as hunt}
			<Card.Root onclick={() => handleViewHunt(hunt.huntId)} class="bg-white cursor-pointer shadow-sm border h-fit hover:shadow-md transition-all">
				<Card.Content class="p-4">
					<div class="flex items-start justify-between">
						<div>
							<Sparkle class="w-4 h-4 text-blue-500 rotate-45 mb-2" />
							<p class="font-medium text-sm text-gray-800 line-clamp-2 mb-2">{hunt.title}</p>
							<div class="flex items-center gap-1 mt-1">
								<History class="w-3 h-3 text-gray-400" />
								<span class="text-xs text-gray-400">{formatDate(hunt.dateActivated)}</span>
							</div>
						</div>
						<span class="text-xs {getStatusColor(hunt.status)} px-1.5 py-0.5 rounded-full whitespace-nowrap">
							{formatStatus(hunt.status)}
						</span>
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
	{/if}
</div>
