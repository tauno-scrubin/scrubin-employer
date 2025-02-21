<script lang="ts">
	import type { CampaignDetails } from "@/scrubinClient";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Badge } from "$lib/components/ui/badge";
	import { Separator } from "$lib/components/ui/separator";
	import { Calendar, Link2, FileText, Eye, MousePointerClick, Activity, User, Building2, Mail, Phone } from "lucide-svelte";
    import * as Card from "$lib/components/ui/card/index.js";
	import { getColorByStatus } from "@/helpers/campaign";
	import BarChart from "../ui/layer-chart/barChart.svelte";
	import * as colors from "tailwindcss/colors";

	
	let { campaign = $bindable<CampaignDetails | null>(null), open = $bindable(false) }: {
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

<Dialog.Root bind:open onOpenChange={clearData} >
	<Dialog.Content class="max-w-4xl max-h-[90vh] overflow-y-auto">
		{#if campaign}
			<Dialog.Header>
				<div class="flex items-center justify-between">
					<Dialog.Title class="text-2xl">{campaign.name}</Dialog.Title>
					<Badge variant="secondary" class="{getColorByStatus(campaign.status)} capitalize mr-4">
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
						<span class="text-sm text-muted-foreground">Start Date:</span>
						<span class="text-sm font-medium">{formatDate(campaign.dateStart)}</span>
					</div>
					<div class="flex items-center gap-2">
						<Calendar class="h-4 w-4 text-muted-foreground" />
						<span class="text-sm text-muted-foreground">End Date:</span>
						<span class="text-sm font-medium">{formatDate(campaign.dateEnd)}</span>
					</div>
				</div>

				<Separator />

				<!-- Statistics Card.s -->
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<Card.Root>
						<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
							<Card.Title class="text-sm font-medium">Total Views</Card.Title>
							<Eye class="h-4 w-4 text-muted-foreground" />
						</Card.Header>
						<Card.Content>
							<div class="text-2xl font-bold">{campaign.views.total || 0}</div>
						</Card.Content>
					</Card.Root>

					<Card.Root>
						<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
							<Card.Title class="text-sm font-medium">Total Clicks</Card.Title>
							<MousePointerClick class="h-4 w-4 text-muted-foreground" />
						</Card.Header>
						<Card.Content>
							<div class="text-2xl font-bold">{campaign.clicks.total || 0}</div>
						</Card.Content>
					</Card.Root>

					<Card.Root>
						<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
							<Card.Title class="text-sm font-medium">Total Custom Actions</Card.Title>
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
							<Card.Title class="text-lg">Performance Over Time</Card.Title>
						</Card.Header>
						<Card.Content class="space-y-8 ">
							<!-- Views Chart -->
							<div class="space-y-2">
								<div class="flex items-center justify-between">
									<h4 class="text-sm font-medium">Views</h4>
									<span class="text-sm text-muted-foreground">{campaign.views.total || 0} total</span>
								</div>
								<BarChart byDay={campaign.views.byDay} color={colors.red[500]} />
							</div>

							<!-- Clicks Chart -->
							<div class="space-y-2">
								<div class="flex items-center justify-between">
									<h4 class="text-sm font-medium">Clicks</h4>
									<span class="text-sm text-muted-foreground">{campaign.clicks.total || 0} total</span>
								</div>
								<BarChart byDay={campaign.clicks.byDay} color={colors.green[500]} />
							</div>

							<!-- Custom Actions Chart -->
							<div class="space-y-2">
								<div class="flex items-center justify-between">
									<h4 class="text-sm font-medium">Custom Actions</h4>
									<span class="text-sm text-muted-foreground">{campaign.customActions.byDay.reduce((acc, curr) => acc + curr.count, 0)} total</span>
								</div>
								<BarChart byDay={campaign.customActions.byDay} color={colors.purple[500]} />
							</div>
						</Card.Content>
						<Card.Footer class="flex flex-col gap-3">
							<h4 class="text-sm font-medium text-start w-full">Custom Actions history</h4>
							{#each campaign.customActions.contactData as action}
								<div class="flex flex-col gap-2 p-3 rounded-lg border bg-muted/30 w-full">
									<div class="flex items-center gap-2">
										<User class="h-4 w-4 text-muted-foreground" />
										<span class="font-medium">{action.name}</span>
									</div>
									<div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
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
										<p class="text-muted-foreground">No custom actions yet</p>
									</div>
							{/each}
						</Card.Footer>
					</Card.Root>
				</div>

				<!-- Files Section -->
				{#if campaign.files?.length > 0}
					<div class="space-y-4">
						<h3 class="text-lg font-medium">Campaign Files</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							{#each campaign.files as file}
								<a
									href={file.fileUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted transition-colors"
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