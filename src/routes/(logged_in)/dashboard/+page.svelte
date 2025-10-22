<script lang="ts">
	import { page } from '$app/state';
	import SEO from '$lib/components/SEO.svelte';
	import HuntsList from '@/components/dashboard/huntsList.svelte';
	import SearchHistory from '@/components/dashboard/searchHistory.svelte';
	import SimpleSearchView from '@/components/dashboard/simpleSearchView.svelte';
	import type { WorkerLookup } from '@/scrubinClient';
	import { scrubinClient } from '@/scrubinClient/client';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

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

		// Handle return from Stripe checkout
		const urlParams = new URLSearchParams(page.url.search);
		const subscriptionStatus = urlParams.get('subscription');

		if (subscriptionStatus === 'success') {
			toast.success('Subscription created successfully!');
			// Clean up URL
			const newUrl = new URL(page.url);
			newUrl.searchParams.delete('subscription');
			window.history.replaceState({}, '', newUrl.toString());
		} else if (subscriptionStatus === 'cancelled') {
			toast.error('Subscription was cancelled');
			// Clean up URL
			const newUrl = new URL(page.url);
			newUrl.searchParams.delete('subscription');
			window.history.replaceState({}, '', newUrl.toString());
		}
	});
</script>

<SEO title="Employer | Scrubin" description="" type="website" />

<div class="mx-auto w-full max-w-screen-xl space-y-2">
	<!-- Search View -->
	<SimpleSearchView bind:this={searchViewComponent} />

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
