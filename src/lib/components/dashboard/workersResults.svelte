<script lang="ts">
	import { t } from '$lib/i18n';
	import Button from '@/components/ui/button/button.svelte';
	import type { Candidate, Requirements } from '@/scrubinClient';
	import { ArrowLeft, ArrowRight, Info, Loader2, User } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import SingleWorker from './singleWorker.svelte';
	import SingleWorkerDialog from './singleWorkerDialog.svelte';

	// Define constants
	let MAX_SELECTED_WORKERS = 10;
	let showWorkerDialog = $state(false);
	let huntableId = $state<string>('');

	let {
		healthcareWorkers = $bindable<Candidate[]>([]),
		totalItems = $bindable(0),
		isSearching = $bindable(false),
		showResults = $bindable(true),
		workerLookupId = $bindable(),
		searchString = $bindable(''),
		requirements = $bindable<Requirements | null>(null),
		selectedWorkers = $bindable<Record<string, boolean>>({})
	}: {
		healthcareWorkers: Candidate[];
		totalItems: number;
		isSearching: boolean;
		showResults: boolean;
		workerLookupId: number | null;
		searchString: string;
		requirements: Requirements | null;
		selectedWorkers: Record<string, boolean>;
	} = $props();

	// Carousel logic for desktop (show 3 items at a time)
	let currentIndex = $state(0);
	let isDesktop = $state(false);

	onMount(() => {
		const updateWidth = () => {
			isDesktop = window.innerWidth >= 768;
		};
		updateWidth();
		window.addEventListener('resize', updateWidth);
		return () => window.removeEventListener('resize', updateWidth);
	});

	let canNotSelectMoreWorkers = $derived(
		Object.values(selectedWorkers).filter(Boolean).length >= MAX_SELECTED_WORKERS
	);
	let selectedWorkersCount = $derived(Object.values(selectedWorkers).filter(Boolean).length);
	// Compute which items to display on desktop. On mobile, show all.
	let displayedWorkers = $derived(
		isDesktop ? healthcareWorkers.slice(currentIndex, currentIndex + 3) : healthcareWorkers
	);

	function nextSlide() {
		if (currentIndex + 3 < healthcareWorkers.length) {
			currentIndex += 3;
		}
	}

	function prevSlide() {
		if (currentIndex - 3 >= 0) {
			currentIndex -= 3;
		}
	}
</script>

<SingleWorkerDialog
	bind:open={showWorkerDialog}
	bind:huntableSelected={selectedWorkers[huntableId]}
	lookupId={workerLookupId || 0}
	bind:huntableId
	allowSelection={true}
	onSelect={(huntableId) => {
		selectedWorkers[huntableId] = !selectedWorkers[huntableId];
	}}
/>

{#if showResults}
	<div
		class="fixed bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center rounded-full bg-gray-100/60 px-3 py-1.5 text-sm font-medium backdrop-blur-sm sm:left-[55vw]"
	>
		<User class="mr-1.5 h-4 w-4 text-primary" />
		<span
			>{selectedWorkersCount}/{MAX_SELECTED_WORKERS} {$t('dashboard.workersResults.selected')}</span
		>
	</div>
{/if}

<div class="mb-2 flex w-full flex-col items-center gap-2 pb-7">
	{#if showResults}
		<div transition:slide class="mt-2 w-full">
			{#if !isSearching}
				<!-- Search Results Header - Improved design -->

				<!-- Carousel Navigation -->
				{#if healthcareWorkers.length > 3}
					<div class="mb-3 flex items-center justify-between gap-2">
						<p
							class="flex items-center gap-2 rounded-md border border-blue-500 bg-blue-50/50 p-2 text-sm text-blue-500"
						>
							<Info class="h-4 w-4 flex-shrink-0" />
							{$t('dashboard.workersResults.chooseProfiles')}
						</p>
						<div class="flex items-center justify-end gap-2">
							<Button
								variant="outline"
								size="icon"
								class="h-9 w-9 rounded-full border-gray-200 transition-all duration-200 hover:bg-gray-100 hover:text-primary"
								disabled={currentIndex === 0}
								onclick={prevSlide}
							>
								<ArrowLeft class="h-4 w-4" />
							</Button>
							<Button
								variant="outline"
								size="icon"
								class="h-9 w-9 rounded-full border-gray-200 transition-all duration-200 hover:bg-gray-100 hover:text-primary"
								disabled={currentIndex + 3 >= healthcareWorkers.length}
								onclick={nextSlide}
							>
								<ArrowRight class="h-4 w-4" />
							</Button>
						</div>
					</div>
				{/if}

				<!-- Worker Cards Grid -->
				<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
					{#each isDesktop ? displayedWorkers : healthcareWorkers as worker, i (worker.id)}
						<SingleWorker
							{worker}
							allowSelection={true}
							disabled={canNotSelectMoreWorkers}
							checked={selectedWorkers[worker.id]}
							onView={(worker) => {
								huntableId = worker.id;
								showWorkerDialog = true;
							}}
							onSelect={(worker) => {
								selectedWorkers[worker.id] = !selectedWorkers[worker.id];
							}}
						/>
					{/each}
				</div>

				<!-- Pagination indicator for mobile -->
				{#if !isDesktop && healthcareWorkers.length > 3}
					<div class="mt-6 flex justify-center">
						<span class="text-xs text-gray-500">{$t('dashboard.workersResults.moreResults')}</span>
					</div>
				{/if}
			{:else}
				<div class="flex h-40 items-center justify-center">
					<Loader2 class="h-8 w-8 animate-spin text-primary" />
				</div>
			{/if}
		</div>
	{/if}
</div>
