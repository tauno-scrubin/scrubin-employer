<script lang="ts">
	import { page } from "$app/state";
	import SearchView from "@/components/dashboard/searchView.svelte";
	import { onMount } from 'svelte';


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
  
<div class="space-y-2 max-w-screen-xl mx-auto w-full">

	<!-- Search View -->
	<SearchView 
		bind:this={searchViewComponent} 
		onSearchComplete={handleSearchComplete}
		onNewSearch={handleNewSearch}
	/>

</div>
