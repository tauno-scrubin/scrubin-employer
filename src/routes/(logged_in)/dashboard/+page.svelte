<script lang="ts">
	import { page } from '$app/state';
	import SEO from '$lib/components/SEO.svelte';
	import HuntsList from '@/components/dashboard/huntsList.svelte';
	import SearchHistory from '@/components/dashboard/searchHistory.svelte';
	import SimpleSearchView from '@/components/dashboard/simpleSearchView.svelte';
	import type { WorkerLookup } from '@/scrubinClient';
	import { scrubinClient } from '@/scrubinClient/client';
	import { onMount } from 'svelte';

	let searchViewComponent: SimpleSearchView;
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

	function handleViewHunt(huntId: number) {
		// This function is passed to HuntsList component
		// The HuntsList component handles the navigation internally
	}

	onMount(() => {
		loadSearchHistory();
	});
</script>

<SEO title="Employer | Scrubin" description="" type="website" />

<div class="mx-auto w-full max-w-screen-xl space-y-2">
	<!-- Search View -->
	<SimpleSearchView
		redirect={true}
		bind:this={searchViewComponent}
	/>

	{#if !isSearchActive}
		<div class="grid gap-4">
			<div class="col-span-4">
				<HuntsList onViewHunt={handleViewHunt} />
			</div>

			<!-- <div class="col-span-2 border-l border-opacity-50 pl-4">
				<SearchHistory />
			</div> -->
		</div>
	{/if}
</div>
