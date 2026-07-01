<script lang="ts">
	import { page } from '$app/state';
	import SEO from '$lib/components/SEO.svelte';
	import CompanyStats from '@/components/dashboard/companyStats.svelte';
	import HuntsList from '@/components/dashboard/huntsList.svelte';
	import SimpleSearchView from '@/components/dashboard/simpleSearchView.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import type { WorkerLookup } from '@/scrubinClient';
	import { currentUser, scrubinClient } from '@/scrubinClient/client';
	import { isMainAccount } from '$lib/permissions';
	import { t } from '$lib/i18n';
	import { Users } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	// Multi-user: CompanyStats / SimpleSearchView fetch plans + billing +
	// worker-lookups — sub-users 403 on those. Hide the whole strip for
	// non-main-account; their dashboard is just the hunts list.
	const showMainAccountStrip = $derived(isMainAccount($currentUser));

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
		// Skip search-history fetch for sub-users — they don't see the search UI
		// and the underlying endpoint is main-account scoped.
		if (showMainAccountStrip) {
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
	<!-- Search View — only main account can source candidates -->
	{#if showMainAccountStrip}
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
		{#if showMainAccountStrip}
			<CompanyStats />
		{/if}
		<HuntsList />
	{/if}
</div>
