<script lang="ts">
	import SEO from "$lib/components/SEO.svelte";
	import SearchView from "@/components/dashboard/searchView.svelte";
	import { scrubinClient } from '@/scrubinClient/client';
	import type { WorkerLookup } from '@/scrubinClient';
	import { onMount } from 'svelte';
	import { page } from "$app/state";


	let searchViewComponent: SearchView;
	let isSearchActive = $state(false);

	function handleRerunSearch(searchText: string) {
		searchViewComponent.searchWorkers(searchText);
		isSearchActive = true;
	}


	function handleSearchComplete() {
		isSearchActive = true;
	}

	function handleNewSearch() {
		isSearchActive = false;
	}

	onMount(() => {
		const searchQuery = page.url.searchParams.get('search');
		if (searchQuery) {
			handleRerunSearch(searchQuery);
		}
	});

</script>
  
<SEO 
	title="Worker Search | Admin Dashboard"
	description="Search and analyze worker candidates based on job descriptions and requirements."
	keywords="worker search, candidates, admin dashboard, sveltekit"
	image="/images/workers-search.jpg"
	type="website"
	canonicalUrl="https://yourwebsite.com/worker-search" />


  
<div class="space-y-2 max-w-screen-xl mx-auto w-full">

	<!-- Search View -->
	<SearchView 
		bind:this={searchViewComponent} 
		onSearchComplete={handleSearchComplete}
		onNewSearch={handleNewSearch}
	/>

</div>
