<script lang="ts">
	import { goto } from '$app/navigation';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import WorkersResults from '@/components/dashboard/workersResults.svelte';
	import Button from '@/components/ui/button/button.svelte';
	import type { Candidate, Requirements } from '@/scrubinClient';
	import { currentUser, scrubinClient } from '@/scrubinClient/client';
	import { ChevronRight, Loader2, Search, Sparkle, Users } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { slide } from 'svelte/transition';
	import Textarea from '../ui/textarea/textarea.svelte';
	import ChatWindow from './chatWindow.svelte';
	import { visible } from './overlay';
	import { t } from '$lib/i18n';

	let {
		redirect = false,
		chatSearch = false,
		onSearchWorkers = undefined,
		onSearchComplete = () => {},
		onNewSearch = () => {}
	}: {
		redirect?: boolean;
		chatSearch?: boolean;
		onSearchWorkers?: (searchText: string) => void;
		onSearchComplete?: () => void;
		onNewSearch?: () => void;
	} = $props();

	let searchText: string = $state('');
	let isLoading: boolean = $state(false);
	let workerLookupId: number | null = $state(null);
	let requirements: Requirements | null = $state(null);
	let inputFocused: boolean = $state(false);

	let healthcareWorkers: Candidate[] = $state([]);
	let totalItems: number = $state(0);
	let showResults: boolean = $state(false);
	let selectedWorkers: Record<string, boolean> = $state({});

	export async function searchWorkers(inputText?: string) {
		if (chatSearch) {
			goto('/dashboard/requirements?search=' + searchText);
			return;
		}
		if (redirect) {
			goto('/dashboard/search?search=' + searchText);
			return;
		}
		const textToSearch = inputText || searchText;
		if (!textToSearch.trim()) return;
		visible.set(true);
		isLoading = true;
		showResults = false;
		try {
			if (inputText) {
				searchText = inputText;
			}

			const result = await scrubinClient.hunt.analyzeWorkerLookups(textToSearch);
			healthcareWorkers = result.examplesCandidates;
			workerLookupId = result.workerLookupId;
			totalItems = result.totalCandidates;
			showResults = true;
			onSearchComplete();
		} catch (error) {
			console.error('Error searching workers:', error);
		} finally {
			visible.set(false);
			isLoading = false;
		}
	}

	function handleNewSearch() {
		healthcareWorkers = [];
		showResults = false;
		requirements = null;
		searchText = '';
		onNewSearch();
	}

	let isLoadingNextStep: boolean = $state(false);

	async function nextStep() {
		if (workerLookupId) {
			try {
				const favoriteCandidateIds = Object.keys(selectedWorkers).filter(
					(key) => selectedWorkers[key]
				);
				if (favoriteCandidateIds.length === 0) {
					toast.error($t('dashboard.searchView.pleaseSelectCandidate'));
					return;
				}
				visible.set(true);
				isLoadingNextStep = true;

				const result = await scrubinClient.hunt.createJobRequirements(
					workerLookupId,
					favoriteCandidateIds
				);
				//goto(`/dashboard/hunts/requirements/${result.requirements.id}`);
				requirements = result;
			} catch (error) {
				toast.error($t('dashboard.searchView.errorAnalyzingRequirements') + error);
				console.error('Error analyzing requirements:', error);
			} finally {
				visible.set(false);
				isLoadingNextStep = false;
			}
		}
	}
</script>

<div class="space-y-6">
	<!-- Search Input Card -->
	{#if !requirements}
		<div class="group/search mb-8 rounded-md bg-gradient-to-br from-blue-50 to-blue-100/50 p-8">
			<div class="mb-2 flex flex-col items-start gap-4">
				<div class="text-blue-600">
					<Sparkle
						fill="currentColor"
						class="h-6 w-6 rotate-45 transition-all duration-200 group-hover/search:rotate-90"
					/>
				</div>
				<h1 class="text-3xl font-medium">
					{$t('dashboard.searchView.welcomeBack', { name: $currentUser?.firstName || '' })}
				</h1>
			</div>

			<div class="rounded-lg border bg-white p-4 shadow-sm">
				<form
					on:submit|preventDefault={() => searchWorkers()}
					class="group relative flex flex-col items-center"
				>
					<Textarea
						bind:value={searchText}
						maxlength={5000}
						onfocus={() => (inputFocused = true)}
						onblur={() => !searchText && (inputFocused = false)}
						placeholder={$t('dashboard.searchView.searchPlaceholder')}
						class="flex-1 resize-none border-0 bg-transparent p-0 px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
					/>

					{#if inputFocused}
						<div
							transition:slide={{ delay: 100, duration: 200 }}
							class="flex w-full items-end justify-between gap-2"
						>
							<span class="text-xs text-gray-400">{searchText.length}/5000</span>
							<div class="flex items-center gap-2">
								<Button
									type="submit"
									variant="default"
									class="h-10 w-10 rounded-full bg-blue-600 p-0 transition-all duration-200 hover:bg-blue-700"
								>
									{#if isLoading}
										<Loader2 class="h-5 w-5 animate-spin" />
									{:else}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="20"
											height="20"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<path d="M22 2L11 13"></path>
											<path d="M22 2l-7 20-4-9-9-4 20-7z"></path>
										</svg>
									{/if}
								</Button>
							</div>
						</div>
					{/if}
				</form>
			</div>

			{#if healthcareWorkers.length > 0 && !isLoading}
				<div class="mt-4 w-full overflow-hidden rounded-lg border bg-white shadow-sm">
					<div class="flex w-full flex-col items-center justify-between sm:flex-row">
						<div
							class="flex w-full flex-1 items-center gap-4 border-b p-5 sm:w-auto sm:border-b-0 sm:border-r"
						>
							<div class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
								<Users class="h-5 w-5  text-blue-600" />
							</div>
							<div class="flex flex-col">
								<div class="flex items-baseline gap-2">
									<span class="text-2xl font-bold text-blue-600">{totalItems}</span>
									<span class="text-sm font-medium text-gray-600"
										>{$t('dashboard.searchView.resultsFound')}</span
									>
								</div>
								<span class="text-xs text-gray-500"
									>{$t('dashboard.searchView.totalMatchingCandidates')}</span
								>
							</div>
						</div>

						{#if healthcareWorkers.length > 0}
							<div class="w-full p-5 sm:w-auto">
								<Tooltip.Provider delayDuration={100} disabled={$currentUser?.status != 'pending'}>
									<Tooltip.Root>
										<Tooltip.Trigger>
											<Button
												onclick={nextStep}
												disabled={isLoadingNextStep || $currentUser?.status == 'pending'}
											>
												{#if isLoadingNextStep}
													<Loader2 class="mr-2 h-4 w-4 animate-spin" />
													{$t('dashboard.searchView.processing')}
												{:else}
													{$t('dashboard.searchView.nextStep')}
													<ChevronRight class="ml-2 h-4 w-4" />
												{/if}
											</Button>
										</Tooltip.Trigger>
										<Tooltip.Content>
											<p>{$t('dashboard.searchView.activateAccount')}</p>
										</Tooltip.Content>
									</Tooltip.Root>
								</Tooltip.Provider>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<!-- Results Card (shown when a search has been performed) -->
		{#if healthcareWorkers}
			<WorkersResults
				bind:selectedWorkers
				bind:healthcareWorkers
				bind:workerLookupId
				bind:totalItems
				bind:isSearching={isLoading}
				bind:showResults
				bind:searchString={searchText}
				bind:requirements
			/>
		{/if}

		{#if healthcareWorkers.length === 0 && !isLoading && showResults}
			<div
				class="mt-4 flex flex-col items-center justify-center rounded-lg border bg-white p-8 shadow-sm"
			>
				<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
					<Search class="h-6 w-6 text-gray-400" />
				</div>
				<h3 class="mb-2 text-lg font-medium text-gray-900">
					{$t('dashboard.searchView.noMatchesFound')}
				</h3>
				<p class="mb-4 max-w-md text-center text-sm text-gray-500">
					{$t('dashboard.searchView.noMatchesDescription')}
				</p>
			</div>
		{/if}
		<!-- Requirements exist -->
	{:else}
		<ChatWindow bind:requirements />
	{/if}
</div>
