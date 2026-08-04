<script lang="ts">
	import { page } from '$app/state';
	import SEO from '$lib/components/SEO.svelte';
	import CompanyStats from '@/components/dashboard/companyStats.svelte';
	import HuntsList from '@/components/dashboard/huntsList.svelte';
	import SimpleSearchView from '@/components/dashboard/simpleSearchView.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import type { WorkerLookup } from '@/scrubinClient';
	import { currentUser, scrubinClient } from '@/scrubinClient/client';
	import { canCreateHunts, isMainAccount } from '$lib/permissions';
	import { t } from '$lib/i18n';
	import { Users } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	// Multi-user: the search strip starts the create-hunt flow, so it follows the
	// permission level (main accounts + full members). CompanyStats stays
	// main-account only — /hunts/company-stats is @MainAccountOnly on the backend.
	const showSearchStrip = $derived(canCreateHunts($currentUser));
	const showCompanyStats = $derived(isMainAccount($currentUser));

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

	onMount(() => {
		// Skip the search-history fetch for view-only members — they don't see the
		// search UI at all.
		if (showSearchStrip) {
			loadSearchHistory();
		}

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

<div class="mx-auto w-full max-w-screen-xl space-y-6">
	<!-- Search View — main accounts and full-access members can source candidates -->
	{#if showSearchStrip}
		<SimpleSearchView bind:this={searchViewComponent} />
	{:else if $currentUser?.team}
		<!-- Sub-user welcome banner — fills the empty space where the search/stats strip would be -->
		<Card.Root class="border-blue-100 bg-blue-50/40">
			<Card.Content class="flex items-center gap-3 p-6">
				<div class="rounded-full bg-blue-100/80 p-2">
					<Users class="h-5 w-5 text-blue-700" />
				</div>
				<div>
					<h2 class="text-xl font-semibold tracking-tight">
						{$t('dashboard.subUser.welcomeTitle', { name: $currentUser.firstName ?? '' })}
					</h2>
					<p class="mt-1 text-sm text-gray-600">
						{$t('dashboard.subUser.welcomeSubtitle', {
							holder:
								$currentUser.team.mainAccountHolderName ?? $currentUser.team.companyBrandName
						})}
					</p>
					<p class="mt-1 text-sm text-gray-600">
						{$t('dashboard.subUser.welcomeContact', {
							holder:
								$currentUser.team.mainAccountHolderName ?? $currentUser.team.companyBrandName
						})}
					</p>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	{#if !isSearchActive}
		{#if showCompanyStats}
			<CompanyStats />
		{/if}
		<HuntsList />
	{/if}
</div>
