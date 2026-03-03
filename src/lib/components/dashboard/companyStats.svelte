<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { t } from '$lib/i18n';
	import type { CompanyStats } from '$lib/scrubinClient';
	import { scrubinClient } from '$lib/scrubinClient/client';
	import {
		ArrowDown,
		Bell,
		Mail,
		MessageSquare,
		Search,
		Send,
		Target,
		UserCheck
	} from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	let isLoading = $state(true);
	let stats = $state<CompanyStats | null>(null);
	let showAllPipeline = $state(false);

	function pct(value: number): number {
		if (!stats || stats.pipeline.offersSent === 0) return 0;
		return Math.round((value / stats.pipeline.offersSent) * 100);
	}

	let pipelineSteps = $derived(
		stats
			? [
					{
						label: $t('dashboard.companyStats.offersSent'),
						value: stats.pipeline.offersSent,
						color: 'bg-blue-500',
						barBg: 'bg-blue-50'
					},
					{
						label: $t('dashboard.companyStats.emailsDelivered'),
						value: stats.pipeline.emailsDelivered,
						color: 'bg-blue-400',
						barBg: 'bg-blue-50'
					},
					{
						label: $t('dashboard.companyStats.emailsOpened'),
						value: stats.pipeline.emailsOpened,
						color: 'bg-indigo-500',
						barBg: 'bg-indigo-50'
					},
					{
						label: $t('dashboard.companyStats.offerPageOpened'),
						value: stats.pipeline.offerPageOpened,
						color: 'bg-violet-500',
						barBg: 'bg-violet-50'
					},
					{
						label: $t('dashboard.companyStats.interested'),
						value: stats.pipeline.interested,
						color: 'bg-purple-500',
						barBg: 'bg-purple-50',
						highlight: true
					},
					{
						label: $t('dashboard.companyStats.underReview'),
						value: stats.pipeline.underReview,
						color: 'bg-purple-400',
						barBg: 'bg-purple-50'
					},
					{
						label: $t('dashboard.companyStats.meetingScheduled'),
						value: stats.pipeline.meetingScheduled,
						color: 'bg-teal-500',
						barBg: 'bg-teal-50'
					},
					{
						label: $t('dashboard.companyStats.screeningCompleted'),
						value: stats.pipeline.screeningCompleted,
						color: 'bg-teal-400',
						barBg: 'bg-teal-50'
					},
					{
						label: $t('dashboard.companyStats.offerMade'),
						value: stats.pipeline.offerMade,
						color: 'bg-green-500',
						barBg: 'bg-green-50'
					},
					{
						label: $t('dashboard.companyStats.accepted'),
						value: stats.pipeline.accepted,
						color: 'bg-green-600',
						barBg: 'bg-green-50',
						highlight: true
					}
				]
			: []
	);

	let displayedSteps = $derived(showAllPipeline ? pipelineSteps : pipelineSteps.slice(0, 4));

	let maxPipelineValue = $derived(
		pipelineSteps.length > 0 ? Math.max(...pipelineSteps.map((s) => s.value), 1) : 1
	);

	let conversionRate = $derived(
		stats && stats.pipeline.offerPageOpened > 0
			? ((stats.pipeline.interested / stats.pipeline.offerPageOpened) * 100).toFixed(1)
			: '0'
	);

	async function loadStats() {
		isLoading = true;
		try {
			stats = await scrubinClient.hunt.getCompanyStats();
		} catch (error) {
			console.error('Error loading company stats:', error);
			toast.error($t('dashboard.companyStats.loadError'));
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		loadStats();
	});
</script>

<div class="space-y-5">
	<h2 class="text-2xl font-medium text-gray-800">{$t('dashboard.companyStats.title')}</h2>

	{#if isLoading}
		<!-- Skeleton Loading State -->
		<div class="space-y-5">
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
				{#each [1, 2, 3] as _}
					<Card.Root class="border bg-white shadow-sm">
						<Card.Content class="p-5">
							<Skeleton class="mb-3 h-4 w-24" />
							<Skeleton class="h-9 w-16" />
							<Skeleton class="mt-2 h-3 w-32" />
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
			<Card.Root class="border bg-white shadow-sm">
				<Card.Content class="p-6">
					<Skeleton class="mb-4 h-5 w-48" />
					<Skeleton class="h-[250px] w-full rounded-lg" />
				</Card.Content>
			</Card.Root>
		</div>
	{:else if !stats || stats.totalHunts === 0}
		<!-- Empty State -->
		<div class="flex flex-col items-center justify-center py-8 text-center">
			<div class="mb-3 rounded-full bg-blue-50/50 p-3">
				<Search class="h-5 w-5 text-primary/60" />
			</div>
			<p class="text-sm font-medium text-gray-600">{$t('dashboard.companyStats.noHuntsYet')}</p>
			<p class="mt-1 max-w-[250px] text-xs text-gray-400">
				{$t('dashboard.companyStats.noHuntsDescription')}
			</p>
		</div>
	{:else}
		<!-- Section A: Hero Metrics -->
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
			<!-- Active Hunts -->
			<Card.Root class="border-l-4 border-l-blue-500 border bg-white shadow-sm">
				<Card.Content class="p-5">
					<div class="flex items-center justify-between">
						<p class="text-sm font-medium text-gray-500">
							{$t('dashboard.companyStats.activeHunts')}
						</p>
						<Target class="h-5 w-5 text-blue-500" />
					</div>
					<p class="mt-2 text-3xl font-bold text-gray-900">{stats.activeHunts}</p>
					<p class="mt-1 text-xs text-gray-400">
						{$t('dashboard.companyStats.outOf')}
						{stats.totalHunts}
						{$t('dashboard.companyStats.totalHuntsLower')}
					</p>
				</Card.Content>
			</Card.Root>

			<!-- Candidates Reached -->
			<Card.Root class="border bg-white shadow-sm">
				<Card.Content class="p-5">
					<div class="flex items-center justify-between">
						<p class="text-sm font-medium text-gray-500">
							{$t('dashboard.companyStats.candidatesReached')}
						</p>
						<Send class="h-5 w-5 text-gray-400" />
					</div>
					<p class="mt-2 text-3xl font-bold text-gray-900">{stats.pipeline.offersSent}</p>
					<p class="mt-1 text-xs text-gray-400">
						{$t('dashboard.companyStats.offersDelivered', { count: stats.pipeline.emailsDelivered })}
					</p>
				</Card.Content>
			</Card.Root>

			<!-- Interested & Hired -->
			<Card.Root class="border-l-4 border-l-purple-500 border bg-white shadow-sm">
				<Card.Content class="p-5">
					<div class="flex items-center justify-between">
						<p class="text-sm font-medium text-gray-500">
							{$t('dashboard.companyStats.interested')}
						</p>
						<UserCheck class="h-5 w-5 text-purple-500" />
					</div>
					<p class="mt-2 text-3xl font-bold text-gray-900">{stats.pipeline.interested}</p>
					<div class="mt-2 flex items-center gap-1.5">
						<span class="inline-flex items-center rounded-md bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
							{stats.pipeline.accepted} {$t('dashboard.companyStats.accepted').toLowerCase()}
						</span>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Section B: Recruitment Pipeline -->
		<Card.Root class="border bg-white shadow-sm">
			<Card.Content class="p-5">
				<h3 class="mb-5 text-lg font-medium text-gray-800">
					{$t('dashboard.companyStats.pipelineFunnel')}
				</h3>

				<div class="space-y-1.5">
					{#each displayedSteps as step}
						{@const barWidth = step.value > 0 ? Math.max(2, (step.value / maxPipelineValue) * 100) : 0}
						<div
							class="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-gray-50/80 {step.highlight ? 'bg-gray-50' : ''}"
						>
							<span class="w-36 shrink-0 truncate text-sm text-gray-600 sm:w-44">
								{step.label}
							</span>
							<div class="relative flex-1">
								<div class="h-3.5 w-full rounded {step.barBg}">
									<div
										class="h-3.5 rounded {step.color} transition-all duration-500"
										style="width: {barWidth}%"
									></div>
								</div>
							</div>
							<span
								class="ml-2 w-14 text-right text-sm font-semibold tabular-nums text-gray-900"
							>
								{step.value.toLocaleString()}
							</span>
							<span class="ml-1 w-12 text-right text-xs tabular-nums text-gray-400">
								{pct(step.value)}%
							</span>
						</div>
					{/each}
				</div>

				<!-- Conversion insight + Show more -->
				<div class="mt-3 flex items-center justify-between px-3">
					<p class="text-xs text-gray-400">
						{conversionRate}% {$t('dashboard.companyStats.conversionRate')}
					</p>
					<button
						class="flex items-center gap-1 text-sm text-primary/70 hover:text-primary"
						onclick={() => (showAllPipeline = !showAllPipeline)}
					>
						{showAllPipeline ? $t('dashboard.companyStats.hideDetails') : $t('dashboard.companyStats.viewDetails')}
						<ArrowDown class="h-3.5 w-3.5 transition-transform {showAllPipeline ? 'rotate-180' : ''}" />
					</button>
				</div>

				<!-- Negative Outcomes -->
				<Separator class="my-4" />
				<div class="flex flex-wrap gap-x-6 gap-y-2">
					<div class="flex items-center gap-2">
						<span class="h-2.5 w-2.5 rounded-full bg-red-400"></span>
						<span class="text-sm text-gray-500">{$t('dashboard.companyStats.rejected')}</span>
						<span class="text-sm font-semibold tabular-nums text-gray-700">{stats.pipeline.rejected.toLocaleString()}</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="h-2.5 w-2.5 rounded-full bg-orange-400"></span>
						<span class="text-sm text-gray-500">{$t('dashboard.companyStats.expired')}</span>
						<span class="text-sm font-semibold tabular-nums text-gray-700">{stats.pipeline.expired.toLocaleString()}</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="h-2.5 w-2.5 rounded-full bg-gray-400"></span>
						<span class="text-sm text-gray-500">{$t('dashboard.companyStats.declined')}</span>
						<span class="text-sm font-semibold tabular-nums text-gray-700">{stats.pipeline.declined.toLocaleString()}</span>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Section C: Engagement -->
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
			<!-- Active Conversations -->
			<Card.Root class="border bg-white shadow-sm">
				<Card.Content class="flex items-center gap-3 px-4 py-3">
					<div class="rounded-lg bg-blue-50 p-2">
						<MessageSquare class="h-4 w-4 text-blue-600" />
					</div>
					<div>
						<p class="text-xs text-gray-400">
							{$t('dashboard.companyStats.activeConversations')}
						</p>
						<p class="text-lg font-semibold text-gray-900">
							{stats.engagement.activeConversations}
						</p>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Messages -->
			<Card.Root class="border bg-white shadow-sm">
				<Card.Content class="flex items-center gap-3 px-4 py-3">
					<div class="rounded-lg bg-purple-50 p-2">
						<Mail class="h-4 w-4 text-purple-600" />
					</div>
					<div>
						<p class="text-xs text-gray-400">{$t('dashboard.companyStats.totalMessages')}</p>
						<p class="text-lg font-semibold text-gray-900">{stats.engagement.totalMessages}</p>
						<p class="text-[11px] text-gray-400">
							{stats.engagement.totalChatMessagesSent}
							{$t('dashboard.companyStats.sent')} / {stats.engagement.totalChatMessagesReceived}
							{$t('dashboard.companyStats.received')}
						</p>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Reminders -->
			<Card.Root class="border bg-white shadow-sm">
				<Card.Content class="flex items-center gap-3 px-4 py-3">
					<div class="rounded-lg bg-amber-50 p-2">
						<Bell class="h-4 w-4 text-amber-600" />
					</div>
					<div>
						<p class="text-xs text-gray-400">
							{$t('dashboard.companyStats.totalRemindersSent')}
						</p>
						<p class="text-lg font-semibold text-gray-900">
							{stats.engagement.totalRemindersSent}
						</p>
						<p class="text-[11px] text-gray-400">
							{stats.engagement.offerRemindersSent}
							{$t('dashboard.companyStats.offerRemindersShort')} / {stats.engagement.chatRemindersSent}
							{$t('dashboard.companyStats.chatRemindersShort')}
						</p>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	{/if}
</div>
