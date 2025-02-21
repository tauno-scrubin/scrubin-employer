<script lang="ts">
	import SEO from "$lib/components/SEO.svelte";
	import SearchView from "@/components/dashboard/searchView.svelte";
	import * as Tabs from "$lib/components/ui/tabs";
	import SearchHistory from "@/components/dashboard/searchHistory.svelte";

	let searchViewComponent: SearchView;
	let activeTab = $state("history");

	let searchWorkers = (searchText: string) => {
		activeTab = "new_search";  // Switch to the search tab
		searchViewComponent.searchWorkers(searchText); 
	}
</script>
  
<SEO 
	title="Worker Search | Admin Dashboard"
	description="Search and analyze worker candidates based on job descriptions and requirements."
	keywords="worker search, candidates, admin dashboard, sveltekit"
	image="/images/workers-search.jpg"
	type="website"
	canonicalUrl="https://yourwebsite.com/worker-search" />
  


	<Tabs.Root bind:value={activeTab} class="w-full">
		<Tabs.List>
		  <Tabs.Trigger value="history">History</Tabs.Trigger>
		  <Tabs.Trigger value="new_search">New Search</Tabs.Trigger>
		</Tabs.List>
		<Tabs.Content value="history">
		  <SearchHistory onSearchWorkers={searchWorkers} />
		</Tabs.Content>
		<Tabs.Content value="new_search">
			<SearchView bind:this={searchViewComponent} />
		</Tabs.Content>
	  </Tabs.Root>
