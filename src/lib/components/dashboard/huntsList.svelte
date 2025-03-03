<script lang="ts">
	import { scrubinClient } from '@/scrubinClient/client';
	import type { Hunt, Requirements } from '@/scrubinClient';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Loader2, ArrowRight, Clock, Search, History, Sparkle, ArrowDown } from 'lucide-svelte';
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
	let showAllHunts = $state(false);
	let showAllDrafts = $state(false);
	let drafts: Requirements['requirements'][] = $state([]);

	async function loadHunts() {
		isLoading = true;
		try {
			const response = await scrubinClient.hunt.getHunts();
            console.log(response);
			hunts = response.items;
			// Sort hunts: ACTIVE first, then by date (newest first)
			hunts.sort((a, b) => {
				// First prioritize ACTIVE status
				if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
				if (a.status !== 'ACTIVE' && b.status === 'ACTIVE') return 1;
				
				// Then sort by date (newest first)
				return new Date(b.dateActivated).getTime() - new Date(a.dateActivated).getTime();
			});
		} catch (error) {
			console.error('Error loading hunts:', error);
		} finally {
			isLoading = false;
		}
	}

	async function loadDrafts() {
		try {
			const response = await scrubinClient.hunt.getAllRequirements();
			drafts = response.items;

		} catch (error) {
			console.error('Error loading drafts:', error);
		}
	}

	function toggleShowAllHunts() {
		showAllHunts = !showAllHunts;
	}

	function toggleShowAllDrafts() {
		showAllDrafts = !showAllDrafts;
	}

	function getDisplayedHunts() {
		return showAllHunts ? hunts : hunts.slice(0, 6);
	}

	function getDisplayedDrafts() {
		return showAllDrafts ? drafts : drafts.slice(0, 6);
	}

	function handleViewHunt(huntId: number, status: string) {
		if (status === 'ACTIVE') {
			goto(`/dashboard/hunts/${huntId}`);
		} else {
			goto(`/dashboard/hunts/requirements/${huntId}`);
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
		loadHunts();
		loadDrafts();
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
		{#each getDisplayedHunts() as hunt}
			<Card.Root onclick={() => handleViewHunt(hunt.huntId, hunt.status)} class="bg-white cursor-pointer shadow-sm border hover:shadow-md transition-all h-full">
				<Card.Content class="p-4 flex flex-col h-full">
					<div class="flex items-start justify-between">
						<div>
							<Sparkle class="w-4 h-4 text-blue-500 rotate-45 mb-2" />
							<p class="font-medium text-sm text-gray-800 line-clamp-2 mb-2">{hunt.title}</p>
						</div>
						<span class="text-xs {getStatusColor(hunt.status)} px-1.5 py-0.5 rounded-full whitespace-nowrap">
							{formatStatus(hunt.status)}
						</span>
					</div>
					<div class="mt-auto">
						<div class="flex items-center gap-1">
							<History class="w-3 h-3 text-gray-400" />
							<span class="text-xs text-gray-400">{formatDate(hunt.dateActivated || hunt.dateCreated)}</span>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
		
		{#if hunts.length > 6}
			<div class="col-span-full flex justify-start mt-4">
				<Button variant="link" onclick={toggleShowAllHunts} class="text-sm  px-0">
					{showAllHunts ? 'Show Less' : 'View More'}
					<ArrowDown class=" h-4 w-4 {showAllHunts ? 'rotate-180' : ''}" />
				</Button>
			</div>
		{/if}
	{/if}
</div>

<!-- Drafts Section -->
<h2 class="text-2xl font-medium text-gray-800 mb-4 mt-8">Drafts</h2>
<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
	{#if isLoading}
		<div class="col-span-full flex justify-center items-center h-40">
			<Loader2 class="h-5 w-5 animate-spin text-primary/70" />
		</div>
	{:else if drafts.length === 0}
		<div class="col-span-full flex flex-col items-center justify-center py-12 text-center">
			<div class="bg-blue-50/50 p-3 rounded-full mb-3">
				<Search class="h-5 w-5 text-primary/60" />
			</div>
			<p class="text-sm font-medium text-gray-600">No drafts</p>
			<p class="text-xs text-gray-400 mt-1 max-w-[200px]">Your drafts will appear here</p>
		</div>
	{:else}
		{#each getDisplayedDrafts() as draft}
			<Card.Root onclick={() => goto(`/dashboard/hunts/requirements/${draft.id}`)} class="bg-white cursor-pointer shadow-sm border hover:shadow-md transition-all h-full">
				<Card.Content class="p-4 flex flex-col h-full">
					<div class="flex items-start justify-between">
						<div>
							<Clock class="w-4 h-4 text-neutral-500 mb-2" />
							<p class="font-medium text-sm text-gray-800 line-clamp-2 mb-2">{draft.jobTitle || 'Untitled Draft'}</p>
						</div>
						<span class="text-xs bg-neutral-100 text-neutral-800 px-1.5 py-0.5 rounded-full whitespace-nowrap">
							Draft
						</span>
					</div>
					<div class="mt-auto">
						<div class="flex items-center gap-1">
							<History class="w-3 h-3 text-gray-400" />
							<span class="text-xs text-gray-400">{formatDate(draft.createdDateTime)}</span>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
		
		{#if drafts.length > 6}
			<div class="col-span-full flex justify-start mt-4">
				<Button variant="link" onclick={toggleShowAllDrafts} class="text-sm px-0">
					{showAllDrafts ? 'Show Less' : 'View More'}
					<ArrowDown class=" h-4 w-4 {showAllDrafts ? 'rotate-180' : ''}" />
				</Button>
			</div>
		{/if}
	{/if}
</div>
