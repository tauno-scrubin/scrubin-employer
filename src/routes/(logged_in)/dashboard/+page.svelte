<script lang="ts">
	import { page } from '$app/state';
	import SEO from '$lib/components/SEO.svelte';
	import HuntsList from '@/components/dashboard/huntsList.svelte';
	import SearchHistory from '@/components/dashboard/searchHistory.svelte';
	import SearchView from '@/components/dashboard/searchView.svelte';
	import type { WorkerLookup } from '@/scrubinClient';
	import { scrubinClient } from '@/scrubinClient/client';
	import { onMount } from 'svelte';

	let searchViewComponent: SearchView;
	let isLoading = $state(false);
	let searchHistory: WorkerLookup[] = $state([]);
	let isSearchActive = $state(false);
	let chatSearch = $state(false);

	$effect(() => {
		const urlParams = new URLSearchParams(page.url.search);
		chatSearch = urlParams.get('chat') === 'true';
	});

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

<SEO title="Employer | Scrubin" description="" type="website" />

<div class="mx-auto w-full max-w-screen-xl space-y-2">
	<!-- Search View -->
	<SearchView
		redirect={true}
		chatSearch={true}
		bind:this={searchViewComponent}
		onSearchComplete={handleSearchComplete}
		onNewSearch={handleNewSearch}
	/>

	{#if !isSearchActive}
		<div class="grid grid-cols-6 gap-4">
			<div class="col-span-4">
				<HuntsList />
			</div>

			<div class="col-span-2 border-l border-opacity-50 pl-4">
				<SearchHistory />
			</div>
		</div>
	{/if}
</div>
