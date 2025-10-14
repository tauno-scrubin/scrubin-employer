<script lang="ts">
	import { scrubinClient } from '@/scrubinClient/client';
	import type { Hunt, Requirements } from '@/scrubinClient';
	import * as Card from '$lib/components/ui/card/index.js';
	import {
		Loader2,
		ArrowRight,
		Clock,
		Search,
		History,
		Sparkle,
		ArrowDown,
		Users,
		UserCheck,
		MessageSquare,
		HelpCircle
	} from 'lucide-svelte';
	import { onMount } from 'svelte';
	import Button from '../ui/button/button.svelte';
	import { goto } from '$app/navigation';
	import { formatStatus, getStatusColor } from '../payment/payments';
	import { t } from '$lib/i18n';
	import { visible } from '@/components/dashboard/overlay';

	let {
		onViewHunt
	}: {
		onViewHunt: (huntId: number) => void;
	} = $props();

	let isLoading = $state(false);
	let hunts: Hunt[] = $state([]);
	let showAllHunts = $state(false);
	let showAllDrafts = $state(false);
	let drafts: Requirements['requirements'][] = $state([]);

	async function loadHunts() {
		isLoading = true;
		try {
			const response = await scrubinClient.hunt.getHunts();
			hunts = response.items.map((hunt) => ({
				...hunt,
				totalCandidates: hunt.totalCandidates,
				totalInterestedCandidates: hunt.totalInterestedCandidates,
				totalUnreadMessages: hunt.totalUnreadMessages,
				totalUnansweredQuestions: hunt.totalUnansweredQuestions
			}));
			// Sort hunts: ACTIVE first, then by unanswered activity, then by date (newest first)
			hunts.sort((a, b) => {
				// First prioritize ACTIVE status
				if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
				if (a.status !== 'ACTIVE' && b.status === 'ACTIVE') return 1;

				// Then prioritize hunts with unanswered chats or questions
				const aHasUnanswered = a.totalUnreadMessages > 0 || a.totalUnansweredQuestions > 0;
				const bHasUnanswered = b.totalUnreadMessages > 0 || b.totalUnansweredQuestions > 0;

				if (aHasUnanswered && !bHasUnanswered) return -1;
				if (!aHasUnanswered && bHasUnanswered) return 1;

				// Then sort by date (newest first)
				return new Date(b.dateActivated).getTime() - new Date(a.dateActivated).getTime();
			});
		} catch (error) {
			console.error('Error loading hunts:', error);
		} finally {
			isLoading = false;
		}
	}

	async function loadDrafts() {
		try {
			const response = await scrubinClient.hunt.getAllRequirements();
			drafts = response.items;
		} catch (error) {
			console.error('Error loading drafts:', error);
		}
	}

	async function navigateToRequirement(requirementId: number) {
		try {
			visible.set(true);
			goto(`/dashboard/hunts/requirements/${requirementId}`);
		} catch (error) {
			console.error('Error loading requirement reach:', error);
		} finally {
			visible.set(false);
		}
	}

	function toggleShowAllHunts() {
		showAllHunts = !showAllHunts;
	}

	function toggleShowAllDrafts() {
		showAllDrafts = !showAllDrafts;
	}

	function getDisplayedHunts() {
		return showAllHunts ? hunts : hunts.slice(0, 6);
	}

	function getDisplayedDrafts() {
		return showAllDrafts ? drafts : drafts.slice(0, 6);
	}

	async function handleViewHunt(huntId: number, status: string) {
		if (['ACTIVE', 'PENDING', 'AWAITING_PAYMENT', 'PAUSED', 'COMPLETED'].includes(status)) {
			goto(`/dashboard/hunts/${huntId}`);
		} else {
			const requirementId = await getSingleRequirementFromHunt(huntId);
			goto(`/dashboard/hunts/requirements/${requirementId}`);
		}
	}

	async function getSingleRequirementFromHunt(huntId: number) {
		const response = await scrubinClient.hunt.getHuntById(huntId);
		return response.requirements.id;
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function formatTime(dateString: string) {
		return new Date(dateString).toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	onMount(() => {
		loadHunts();
		loadDrafts();
	});
</script>

<h2 class="mb-4 text-2xl font-medium text-gray-800">{$t('dashboard.huntsList.headhunting')}</h2>
<div class="max-h-[500px] space-y-4 overflow-y-auto pr-1">
	{#if isLoading}
		<div class="flex h-40 items-center justify-center">
			<Loader2 class="h-5 w-5 animate-spin text-primary/70" />
		</div>
	{:else if hunts.length === 0}
		<div class="flex flex-col items-center justify-center py-12 text-center">
			<div class="mb-3 rounded-full bg-blue-50/50 p-3">
				<Search class="h-5 w-5 text-primary/60" />
			</div>
			<p class="text-sm font-medium text-gray-600">{$t('dashboard.huntsList.noActiveHunts')}</p>
			<p class="mt-1 max-w-[200px] text-xs text-gray-400">
				{$t('dashboard.huntsList.huntsWillAppearHere')}
			</p>
		</div>
	{:else}
		{#each getDisplayedHunts() as hunt}
			<Card.Root
				onclick={() => handleViewHunt(hunt.huntId, hunt.status)}
				class="relative cursor-pointer border bg-white shadow-sm transition-all hover:shadow-md"
			>
				<Card.Content class="p-4 sm:p-6">
					<span
						class="absolute right-2 top-2 text-xs sm:right-3 sm:top-3 {getStatusColor(
							hunt.status
						)} whitespace-nowrap rounded-full px-2 py-1"
					>
						{$t(`hunt.huntStatus.${hunt.status.toLowerCase()}`)}
					</span>
					<div class="flex items-start justify-between">
						<div class="flex-1 pr-16 sm:pr-20">
							<div class="mb-3 flex items-center gap-2">
								<Sparkle class="h-4 w-4 flex-shrink-0 rotate-45 text-blue-500" />
								<h3 class="text-base font-medium leading-tight text-gray-800 sm:text-lg">
									{hunt.title}
								</h3>
							</div>

							<!-- Stats Row -->
							<div class="mb-4 flex flex-wrap items-center gap-3 sm:gap-6">
								<div class="flex items-center gap-1.5">
									<Users class="h-4 w-4 text-gray-500" />
									<span class="text-sm text-gray-600">
										{hunt.totalCandidates}
										{$t('dashboard.huntsList.candidates')}
									</span>
								</div>
								{#if hunt.totalInterestedCandidates > 0}
									<div class="flex items-center gap-1.5">
										<UserCheck class="h-4 w-4 text-green-500" />
										<span class="text-sm text-gray-600">
											{hunt.totalInterestedCandidates}
											{$t('dashboard.huntsList.interested')}
										</span>
									</div>
								{/if}
								{#if hunt.totalUnreadMessages > 0}
									<div class="flex items-center gap-1.5">
										<MessageSquare class="h-4 w-4 text-blue-500" />
										<span class="text-sm text-gray-600">
											{hunt.totalUnreadMessages}
											{$t('dashboard.huntsList.unreadMessages')}
										</span>
									</div>
								{/if}
								{#if hunt.totalUnansweredQuestions > 0}
									<div class="flex items-center gap-1.5">
										<HelpCircle class="h-4 w-4 text-amber-500" />
										<span class="text-sm text-gray-600">
											{hunt.totalUnansweredQuestions}
											{$t('dashboard.huntsList.unanswered')}
										</span>
									</div>
								{/if}
							</div>

							<div class="flex items-center justify-between">
								<div class="flex items-center gap-1">
									<History class="h-3 w-3 flex-shrink-0 text-gray-400" />
									<span class="text-xs text-gray-400">{formatDate(hunt.dateActivated || '')}</span>
								</div>
								<!-- status badge moved to absolute top-right -->
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		{/each}

		{#if hunts.length > 6}
			<div class="mt-4 flex justify-start">
				<Button variant="link" onclick={toggleShowAllHunts} class="px-0 text-sm">
					{showAllHunts ? $t('dashboard.huntsList.showLess') : $t('dashboard.huntsList.viewMore')}
					<ArrowDown class="h-4 w-4 {showAllHunts ? 'rotate-180' : ''}" />
				</Button>
			</div>
		{/if}
	{/if}
</div>

<!-- Drafts Section -->
<h2 class="mb-4 mt-8 text-2xl font-medium text-gray-800">{$t('dashboard.huntsList.drafts')}</h2>
<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
	{#if isLoading}
		<div class="col-span-full flex h-40 items-center justify-center">
			<Loader2 class="h-5 w-5 animate-spin text-primary/70" />
		</div>
	{:else if drafts.length === 0}
		<div class="col-span-full flex flex-col items-center justify-center py-12 text-center">
			<div class="mb-3 rounded-full bg-blue-50/50 p-3">
				<Search class="h-5 w-5 text-primary/60" />
			</div>
			<p class="text-sm font-medium text-gray-600">{$t('dashboard.huntsList.noDrafts')}</p>
			<p class="mt-1 max-w-[200px] text-xs text-gray-400">
				{$t('dashboard.huntsList.draftsWillAppearHere')}
			</p>
		</div>
	{:else}
		{#each getDisplayedDrafts() as draft}
			<Card.Root
				onclick={() => navigateToRequirement(draft.id)}
				class="h-full cursor-pointer border bg-white shadow-sm transition-all hover:shadow-md"
			>
				<Card.Content class="flex h-full flex-col p-4">
					<div class="flex items-start justify-between">
						<div>
							<Clock class="mb-2 h-4 w-4 text-neutral-500" />
							<p class="mb-2 line-clamp-2 text-sm font-medium text-gray-800">
								{draft.jobTitle || $t('dashboard.huntsList.untitledDraft')}
							</p>
						</div>
						<span
							class="whitespace-nowrap rounded-full bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-800"
						>
							{$t('dashboard.huntsList.draft')}
						</span>
					</div>
					<div class="mt-auto">
						<div class="flex items-center gap-1">
							<History class="h-3 w-3 text-gray-400" />
							<span class="text-xs text-gray-400">{formatDate(draft.createdDateTime)}</span>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		{/each}

		{#if drafts.length > 6}
			<div class="col-span-full mt-4 flex justify-start">
				<Button variant="link" onclick={toggleShowAllDrafts} class="px-0 text-sm">
					{showAllDrafts ? $t('dashboard.huntsList.showLess') : $t('dashboard.huntsList.viewMore')}
					<ArrowDown class=" h-4 w-4 {showAllDrafts ? 'rotate-180' : ''}" />
				</Button>
			</div>
		{/if}
	{/if}
</div>
