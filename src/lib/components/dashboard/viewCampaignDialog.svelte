<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Separator } from '$lib/components/ui/separator';
	import { t } from '$lib/i18n';
	import { getColorByStatus } from '@/helpers/campaign';
	import type { CampaignDetails } from '@/scrubinClient';
	import {
		Activity,
		Building2,
		Calendar,
		Eye,
		FileText,
		Link2,
		Mail,
		MousePointerClick,
		Phone,
		User
	} from 'lucide-svelte';
	import * as colors from 'tailwindcss/colors';
	import BarChart from '../ui/layer-chart/barChart.svelte';

	let {
		campaign = $bindable<CampaignDetails | null>(null),
		open = $bindable(false)
	}: {
		campaign: CampaignDetails | null;
		open: boolean;
	} = $props();

	$inspect(campaign);

	function formatDate(date: string): string {
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function clearData() {
		campaign = null;
	}
</script>

<Dialog.Root bind:open onOpenChange={clearData}>
	<Dialog.Content class="max-h-[90vh] max-w-4xl overflow-y-auto">
		{#if campaign}
			<Dialog.Header>
				<div class="flex items-center justify-between">
					<Dialog.Title class="text-2xl">{campaign.name}</Dialog.Title>
					<Badge variant="secondary" class="{getColorByStatus(campaign.status)} mr-4 capitalize">
						{campaign.status}
					</Badge>
				</div>
				<Dialog.Description class="mt-2 text-muted-foreground">
					{campaign.description}
				</Dialog.Description>
			</Dialog.Header>

			<div class="space-y-6">
				<!-- Campaign Details -->
				<div class="grid grid-cols-2 gap-2">
					<div class="flex items-center gap-2">
						<Calendar class="h-4 w-4 text-muted-foreground" />
						<span class="text-sm text-muted-foreground">{$t('dashboard.campaign.startDate')}:</span>
						<span class="text-sm font-medium">{formatDate(campaign.dateStart)}</span>
					</div>
					<div class="flex items-center gap-2">
						<Calendar class="h-4 w-4 text-muted-foreground" />
						<span class="text-sm text-muted-foreground">{$t('dashboard.campaign.endDate')}:</span>
						<span class="text-sm font-medium">{formatDate(campaign.dateEnd)}</span>
					</div>
				</div>

				<Separator />

				<!-- Statistics Card.s -->
				<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
					<Card.Root>
						<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
							<Card.Title class="text-sm font-medium"
								>{$t('dashboard.campaign.statistics.totalViews')}</Card.Title
							>
							<Eye class="h-4 w-4 text-muted-foreground" />
						</Card.Header>
						<Card.Content>
							<div class="text-2xl font-bold">{campaign.views.total || 0}</div>
						</Card.Content>
					</Card.Root>

					<Card.Root>
						<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
							<Card.Title class="text-sm font-medium"
								>{$t('dashboard.campaign.statistics.totalClicks')}</Card.Title
							>
							<MousePointerClick class="h-4 w-4 text-muted-foreground" />
						</Card.Header>
						<Card.Content>
							<div class="text-2xl font-bold">{campaign.clicks.total || 0}</div>
						</Card.Content>
					</Card.Root>

					<Card.Root>
						<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
							<Card.Title class="text-sm font-medium"
								>{$t('dashboard.campaign.statistics.totalCustomActions')}</Card.Title
							>
							<Activity class="h-4 w-4 text-muted-foreground" />
						</Card.Header>
						<Card.Content>
							<div class="text-2xl font-bold">{campaign.customActions.total || 0}</div>
						</Card.Content>
					</Card.Root>
				</div>

				<!-- Charts -->
				<div class="space-y-6">
					<Card.Root>
						<Card.Header>
							<Card.Title class="text-lg">{$t('dashboard.campaign.performance')}</Card.Title>
						</Card.Header>
						<Card.Content class="space-y-8 ">
							<!-- Views Chart -->
							<div class="space-y-2">
								<div class="flex items-center justify-between">
									<h4 class="text-sm font-medium">{$t('dashboard.campaign.views')}</h4>
									<span class="text-sm text-muted-foreground"
										>{campaign.views.total || 0} {$t('dashboard.campaign.total')}</span
									>
								</div>
								<BarChart byDay={campaign.views.byDay} color={colors.red[500]} />
							</div>

							<!-- Clicks Chart -->
							<div class="space-y-2">
								<div class="flex items-center justify-between">
									<h4 class="text-sm font-medium">{$t('dashboard.campaign.clicks')}</h4>
									<span class="text-sm text-muted-foreground"
										>{campaign.clicks.total || 0} {$t('dashboard.campaign.total')}</span
									>
								</div>
								<BarChart byDay={campaign.clicks.byDay} color={colors.green[500]} />
							</div>

							<!-- Custom Actions Chart -->
							<div class="space-y-2">
								<div class="flex items-center justify-between">
									<h4 class="text-sm font-medium">{$t('dashboard.campaign.customActions')}</h4>
									<span class="text-sm text-muted-foreground"
										>{campaign.customActions.byDay.reduce((acc, curr) => acc + curr.count, 0)}
										{$t('dashboard.campaign.total')}</span
									>
								</div>
								<BarChart byDay={campaign.customActions.byDay} color={colors.purple[500]} />
							</div>
						</Card.Content>
						<Card.Footer class="flex flex-col gap-3">
							<h4 class="w-full text-start text-sm font-medium">
								{$t('dashboard.campaign.customActionsHistory')}
							</h4>
							{#each campaign.customActions.contactData as action}
								<div class="flex w-full flex-col gap-2 rounded-lg border bg-muted/30 p-3">
									<div class="flex items-center gap-2">
										<User class="h-4 w-4 text-muted-foreground" />
										<span class="font-medium">{action.name}</span>
									</div>
									<div class="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
										<div class="flex items-center gap-2">
											<Building2 class="h-4 w-4 text-muted-foreground" />
											<span class="text-muted-foreground">{action.company}</span>
										</div>
										<div class="flex items-center gap-2">
											<Mail class="h-4 w-4 text-muted-foreground" />
											<span class="text-muted-foreground">{action.email}</span>
										</div>
										<div class="flex items-center gap-2">
											<Phone class="h-4 w-4 text-muted-foreground" />
											<span class="text-muted-foreground">{action.phone}</span>
										</div>
										<div class="flex items-center gap-2">
											<Calendar class="h-4 w-4 text-muted-foreground" />
											<span class="text-muted-foreground">
												{new Date(action.date).toLocaleDateString('en-US', {
													year: 'numeric',
													month: 'long',
													day: 'numeric'
												})}
											</span>
										</div>
									</div>
								</div>
							{:else}
								<div class="flex items-center justify-center h-full py-12">
									<p class="text-muted-foreground">{$t('dashboard.campaign.noCustomActions')}</p>
								</div>
							{/each}
						</Card.Footer>
					</Card.Root>
				</div>

				<!-- Files Section -->
				{#if campaign.files?.length > 0}
					<div class="space-y-4">
						<h3 class="text-lg font-medium">{$t('dashboard.campaign.campaignFiles')}</h3>
						<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
							{#each campaign.files as file}
								<a
									href={file.fileUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="flex items-center gap-2 rounded-lg border p-3 transition-colors hover:bg-muted"
								>
									<FileText class="h-4 w-4" />
									<span class="flex-1 truncate">{file.fileName}</span>
									<Link2 class="h-4 w-4 text-muted-foreground" />
								</a>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
