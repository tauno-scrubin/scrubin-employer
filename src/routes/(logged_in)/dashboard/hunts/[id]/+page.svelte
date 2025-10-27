<script lang="ts">
	import { page } from '$app/state';
	import PaymentDialog from '$lib/components/payment/paymentDialog.svelte';
	import RequirementsChat from '$lib/components/requirements/RequirementsChat.svelte';
	import RequirementsDetails from '$lib/components/requirements/RequirementsDetails.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import * as Avatar from '$lib/components/ui/avatar';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { t } from '$lib/i18n';
	import type { Currency as Cur, HuntStats, InterestedCandidate } from '$lib/scrubinClient';
	import { scrubinClient } from '$lib/scrubinClient/client';
	import InterestedWorkerDialog from '@/components/dashboard/interestedWorkerDialog.svelte';
	import QuestionsInHunt from '@/components/dashboard/questionsInHunt.svelte';
	import { getStatusColor } from '@/components/payment/payments.js';
	import * as Dialog from '@/components/ui/dialog/index.js';
	import * as DropdownMenu from '@/components/ui/dropdown-menu/index.js';
	import Separator from '@/components/ui/separator/separator.svelte';
	import {
		ArrowLeft,
		Briefcase,
		ChevronDown,
		DollarSign,
		Eye,
		FileText,
		GraduationCap,
		Loader2,
		Mail,
		MailOpen,
		MessageSquare,
		Phone,
		Sparkle,
		Users
	} from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	let { data } = $props();
	let hunt = $state(data.hunt);
	let isRecentlyActivated = $derived(
		hunt?.dateActivated ? Date.now() - new Date(hunt.dateActivated).getTime() < 3600000 : false
	);
	let interestedCandidates = $state<InterestedCandidate[]>([]);
	let showAllInterestedCandidates = $state(false);
	let isLoading = $state(true);
	let isLoadingCandidates = $state(false);
	let showInterestedWorkerDialog = $state(false);
	let selectedCandidateId = $state(0);
	let selectedCandidateType = $state<'offer' | 'apply'>('offer');
	let availableCurrencies = $state<Cur[]>([]);
	let availableCountries = $state<string[]>([]);
	let paymentDialogOpen = $state(false);
	let chargeableAmount = $state({
		amount: 0,
		currency: 'EUR',
		vatPercentage: 0,
		vatAmount: 0
	});

	// Manual edit mode state
	let isEditMode = $state(false);
	let isSaving = $state(false);
	let isCompleting = $state(false);
	let isCancelling = $state(false);
	let isCompleteDialogOpen = $state(false);
	let isCancelDialogOpen = $state(false);
	let isPausing = $state(false);
	let isPauseDialogOpen = $state(false);
	let isPublishing = $state(false);
	let editableRequirements = $state<{
		jobTitle: string;
		jobDescription: string;
		jobRequiredQualifications: string;
		jobRequiredWorkExperience: number;
		salaryStart: number;
		salaryEnd: number;
		salaryCurrency: string;
		country: string;
		city: string;
		stateProvinceRegion: string | string[];
	}>({
		jobTitle: '',
		jobDescription: '',
		jobRequiredQualifications: '',
		jobRequiredWorkExperience: 0,
		salaryStart: 0,
		salaryEnd: 0,
		salaryCurrency: '',
		country: '',
		city: '',
		stateProvinceRegion: ''
	});

	onMount(async () => {
		try {
			// Fetch interested candidates
			isLoadingCandidates = true;
			scrubinClient.hunt
				.getInterestedCandidates(hunt.huntId)
				.then((candidates) => {
					interestedCandidates = candidates;
				})
				.catch((error) => {
					toast.error('Failed to fetch interested candidates');
				})
				.finally(() => {
					isLoadingCandidates = false;
				});

			// Fetch latest stats
			scrubinClient.hunt.getHuntStats(hunt.huntId).then((stats) => {
				funnelStats = {
					huntId: stats.huntId,
					totalHuntables: stats.totalHuntables || 0,
					totalHuntablesContacted: stats.totalHuntablesContacted || 0,
					totalHuntablesInterested: stats.totalHuntablesInterested || 0,
					totalInterestedReadyForCompany: stats.totalInterestedReadyForCompany || 0,
					totalOffersMade: stats.totalOffersMade || 0,
					totalHired: stats.totalHired || 0
				};
			});

			// Check URL for candidateId and open dialog if present
			const candidateId = page.url.searchParams.get('candidateId');
			const candidateExists = interestedCandidates.find(
				(candidate) => candidate.candidateId === parseInt(candidateId || '0')
			);
			if (candidateId && candidateExists) {
				selectedCandidateId = parseInt(candidateId);
				showInterestedWorkerDialog = true;
				activeTab = 'statistics';
			}

			const [currencies, countries] = await Promise.all([
				scrubinClient.company.getCurrencies(),
				scrubinClient.company.getCountries()
			]);
			availableCurrencies = currencies;
			availableCountries = countries;

			hunt = data.hunt;
		} catch (error) {
			console.error('Failed to fetch data:', error);
		} finally {
			isLoading = false;
		}
	});

	$effect(() => {
		if (hunt) {
			// Initialize editable requirements based on current hunt requirements
			editableRequirements = {
				jobTitle: hunt.requirements.jobTitle || '',
				jobDescription: hunt.requirements.jobDescription || '',
				jobRequiredQualifications: hunt.requirements.jobRequiredQualifications || '',
				jobRequiredWorkExperience: hunt.requirements.jobRequiredWorkExperience || 0,
				salaryStart: hunt.requirements.salary?.amountStart || 0,
				salaryEnd: hunt.requirements.salary?.amountEnd || 0,
				salaryCurrency: hunt.requirements.salary?.currency || '',
				country: hunt.requirements.country || '',
				city: hunt.requirements.address?.city || '',
				stateProvinceRegion: hunt.requirements.address?.stateProvinceRegion || ''
			};
		}
	});

	async function makeAdPublic() {
		if (!hunt?.huntId) return;
		isPublishing = true;
		try {
			await scrubinClient.hunt.convertToJobAd(hunt.huntId);
			hunt = await scrubinClient.hunt.getHuntById(hunt.huntId);
			toast.success($t('hunt.visibility.publishSuccess'));
		} catch (error) {
			console.error('Failed to make ad public:', error);
			toast.error($t('hunt.visibility.publishError'));
		} finally {
			isPublishing = false;
		}
	}

	async function completeCurrentHunt() {
		if (!hunt?.huntId) return;
		isCompleting = true;
		try {
			const updated = await scrubinClient.hunt.completeHunt(hunt.huntId);
			// Update local hunt status; avoid reassigning derived value
			hunt.status = updated.status;
			toast.success($t('hunt.completed'));
		} catch (error) {
			console.error('Failed to complete hunt:', error);
			toast.error($t('errors.huntCompleteFailed'));
		} finally {
			isCompleting = false;
			isCompleteDialogOpen = false;
		}
	}

	async function cancelCurrentHunt() {
		if (!hunt?.huntId) return;
		isCancelling = true;
		try {
			const updated = await scrubinClient.hunt.cancelHunt(hunt.huntId);
			// Update local hunt status; avoid reassigning derived value
			hunt.status = updated.status;
			toast.success($t('hunt.cancelled'));
		} catch (error) {
			console.error('Failed to cancel hunt:', error);
			toast.error($t('errors.huntCancelFailed'));
		} finally {
			isCancelling = false;
			isCancelDialogOpen = false;
		}
	}

	async function pauseCurrentHunt() {
		if (!hunt?.huntId) return;
		isPausing = true;
		try {
			const updated = await scrubinClient.hunt.pauseHunt(hunt.huntId);
			hunt.status = updated.status;
			toast.success($t('hunt.paused'));
		} catch (error) {
			console.error('Failed to pause hunt:', error);
			toast.error($t('errors.huntPauseFailed'));
		} finally {
			isPausing = false;
			isPauseDialogOpen = false;
		}
	}

	let funnelStats = $state<HuntStats>({
		huntId: 0,
		totalHuntables: 0,
		totalHuntablesContacted: 0,
		totalHuntablesInterested: 0,
		totalInterestedReadyForCompany: 0,
		totalOffersMade: 0,
		totalHired: 0
	});

	let funnelData = $state<{ name: string; value: number }[]>([]);
	// Update the funnelData to use the reactive funnelStats
	$effect(() => {
		funnelData = [
			{ name: 'statistics.totalHuntables', value: funnelStats.totalHuntables },
			{ name: 'statistics.contacted', value: funnelStats.totalHuntablesContacted },
			{ name: 'statistics.interested', value: funnelStats.totalHuntablesInterested },
			{ name: 'statistics.readyForCompany', value: funnelStats.totalInterestedReadyForCompany },
			{ name: 'statistics.offersMade', value: funnelStats.totalOffersMade },
			{ name: 'statistics.hired', value: funnelStats.totalHired }
		];
	});

	// Define tabs for better organization
	const tabs = [
		{ id: 'details', label: 'Job Details', icon: FileText },
		{ id: 'statistics', label: 'Statistics', icon: FileText },
		{ id: 'questions', label: 'Questions', icon: FileText },
		{ id: 'agent_chat', label: 'Agent chat', icon: FileText }
	];

	let activeTab = $state('details');

	function goToPrevPage() {
		window.history.back();
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function handleActivateOrPay() {
		if (hunt.status === 'PENDING') {
			activateHunt();
		} else if (hunt.status === 'AWAITING_PAYMENT') {
			if (hunt.planType === 'success_fee' && hunt.startFee?.amount > 0) {
				chargeableAmount.amount = hunt.startFee.amount;
				chargeableAmount.currency = hunt.startFee.currency;
				chargeableAmount.vatPercentage = hunt.startFee.vatPercentage;
				chargeableAmount.vatAmount = hunt.startFee.vatAmount;
				paymentDialogOpen = true;
			} else if (hunt.planType === 'success_fee' && hunt.startFee?.amount == 0) {
				toast.error($t('errors.paymentIssue'));
			}
		}
	}

	async function activateHunt() {
		try {
			const response = await scrubinClient.hunt.activateHuntV2(hunt.huntId);
			if (hunt.planType === 'success_fee' && hunt.startFee?.amount > 0) {
				chargeableAmount.amount = hunt.startFee.amount;
				chargeableAmount.currency = hunt.startFee.currency;
				chargeableAmount.vatPercentage = hunt.startFee.vatPercentage;
				chargeableAmount.vatAmount = hunt.startFee.vatAmount;
				paymentDialogOpen = true;
			} else {
				window.location.reload();
			}
		} catch (error) {
			console.error('Failed to activate hunt:', error);
			toast.error('Failed to activate hunt. Please try again.');
		}
	}

	function onPaymentSuccess() {
		window.location.reload();
		toast.success('Payment successful! Hunt is now active.');
	}
</script>

<InterestedWorkerDialog
	bind:open={showInterestedWorkerDialog}
	bind:huntId={hunt.huntId}
	bind:candidateId={selectedCandidateId}
	bind:type={selectedCandidateType}
/>

<PaymentDialog
	bind:open={paymentDialogOpen}
	huntId={hunt.huntId}
	amount={chargeableAmount.amount}
	currency={chargeableAmount.currency}
	vatPercentage={chargeableAmount.vatPercentage}
	vatAmount={chargeableAmount.vatAmount}
	onSuccess={onPaymentSuccess}
/>

<div class="container mx-auto max-w-7xl space-y-6 py-6">
	<div class="mb-6 flex items-center gap-4">
		<Button onclick={goToPrevPage} variant="outline" size="icon" class="h-9 w-9">
			<ArrowLeft class="h-4 w-4" />
		</Button>

		<div>
			<h1 class="text-2xl font-bold tracking-tight">{hunt.requirements.jobTitle}</h1>
			<!-- {#if hunt.requirements.address}
				<p class="text-sm text-muted-foreground">
					{#if hunt.requirements.address.city}
						{hunt.requirements.address.city},
					{/if}
					{#if hunt.requirements.address.stateProvinceRegion}
						{hunt.requirements.address.stateProvinceRegion}
					{/if}
				</p>
			{/if} -->
		</div>
	</div>
	<!-- Status badge at the top -->
	<Tabs.Root bind:value={activeTab} class="w-full">
		<Tabs.List class="grid w-fit grid-cols-3">
			<Tabs.Trigger value="details">{$t('hunt.details')}</Tabs.Trigger>
			<Tabs.Trigger value="statistics">{$t('hunt.statistics')}</Tabs.Trigger>
			<Tabs.Trigger value="questions">{$t('hunt.questions')}</Tabs.Trigger>
			<!-- <Tabs.Trigger value="agent_chat">Agent chat</Tabs.Trigger> -->
		</Tabs.List>
		<Tabs.Content value="details">
			<div class="flex flex-col gap-4 rounded-md bg-blue-50/80 p-4">
				<div class="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm">
					<div class="flex items-center gap-3">
						<div class="{getStatusColor(hunt.status)}  rounded-full p-2">
							<Sparkle
								fill="currentColor"
								strokeWidth="1"
								class="h-4 w-4 {hunt.status === 'ACTIVE'
									? 'animate-[spin_4s_linear_infinite]'
									: ''}"
							/>
						</div>
						<div>
							<h2 class="font-medium">{$t('hunt.title')}</h2>
							<p class="text-sm text-muted-foreground">
								{$t('common.created')}
								{new Date().toLocaleDateString()}
							</p>
						</div>
					</div>
					<!-- {#if hunt.status === 'PENDING' || hunt.status === 'AWAITING_PAYMENT'}
						<div class="flex items-center gap-2">
							<Badge
								variant="outline"
								class="px-3 py-1 {getStatusColor(hunt.status)} border-transparent"
							>
								{$t(`hunt.huntStatus.${hunt.status.toLowerCase()}`)}
							</Badge>
							<Button variant="default" onclick={handleActivateOrPay} class="ml-2">
								{hunt.status === 'PENDING' || hunt.status === 'AWAITING_PAYMENT'
									? $t('payment.activateHunt')
									: $t('payment.completePayment')}
							</Button>
						</div>
					{:else} -->
					<div class="flex items-center gap-2">
						<Badge
							variant="outline"
							class="px-3 py-1 {getStatusColor(hunt.status)} border-transparent"
						>
							{$t(`hunt.huntStatus.${hunt.status.toLowerCase()}`)}
						</Badge>
						{#if hunt.status === 'ACTIVE'}
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									<Button variant="outline" size="sm" class="ml-2 inline-flex items-center gap-1">
										{$t('hunt.actions.actions')}
										<ChevronDown class="h-4 w-4" />
									</Button>
								</DropdownMenu.Trigger>
								<DropdownMenu.Content class="w-40">
									<DropdownMenu.Item onclick={() => (isCompleteDialogOpen = true)}>
										{$t('hunt.actions.complete')}
									</DropdownMenu.Item>
									<DropdownMenu.Item onclick={() => (isPauseDialogOpen = true)}>
										{$t('hunt.actions.pause')}
									</DropdownMenu.Item>
									<DropdownMenu.Separator />
									<DropdownMenu.Item
										class="text-red-600"
										onclick={() => (isCancelDialogOpen = true)}
									>
										{$t('hunt.actions.cancel')}
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						{/if}
					</div>
					<!-- {/if} -->
				</div>

				{#if hunt.status === 'ACTIVE' && !hunt.hasPublicAd}
					<Alert.Root class="border-border bg-background text-foreground">
						<div class="flex items-start justify-between gap-3">
							<div>
								<Alert.Title class="text-sm">{$t('hunt.visibility.title')}</Alert.Title>
								<Alert.Description class="text-xs text-muted-foreground">
									{$t('hunt.visibility.description')}
								</Alert.Description>
							</div>
							<Button
								variant="outline"
								size="sm"
								class="h-7 px-2"
								disabled={isPublishing}
								onclick={makeAdPublic}
							>
								{#if isPublishing}
									<Loader2 class="mr-2 h-3.5 w-3.5 animate-spin" />
								{/if}
								<span class="text-xs">{$t('hunt.visibility.makePublic')}</span>
							</Button>
						</div>
					</Alert.Root>
				{/if}

				{#if hunt.planType === 'success_fee'}
					<div class="rounded-lg bg-white p-4 shadow-sm">
						<div class="grid grid-cols-2 gap-6">
							{#if hunt.successFee?.amount > 0}
								<div class="flex items-center space-x-4 rounded-lg border p-4">
									<div class="rounded-full bg-green-100 p-2">
										<Sparkle class="h-5 w-5 text-green-600" />
									</div>
									<div>
										<p class="text-sm text-muted-foreground">{$t('payment.successFee')}</p>
										<p class="text-lg font-semibold">
											{hunt.successFee.amount}
											{hunt.successFee.currency}
										</p>
									</div>
								</div>
							{/if}
						</div>
						{#if hunt.successFee?.amount > 0}
							<p class="mt-4 text-xs text-muted-foreground">
								{$t('pricing.availablePlans.successFeeNotice')}
							</p>
						{/if}
					</div>
				{/if}

				<!-- Use reusable RequirementsDetails component -->
				<div class="rounded-md bg-white p-4 shadow-sm">
					<RequirementsDetails
						requirements={hunt.requirements}
						{hunt}
						isComplete={true}
						potentialReach={data.stats.totalHuntables}
						completionPercentage={100}
					/>
				</div>
			</div>
		</Tabs.Content>
		<Tabs.Content value="statistics">
			<div class="rounded-md bg-blue-50/80 p-4">
				<div class="flex flex-col gap-4 rounded-md bg-white p-4">
					<h4 class="text-xl font-semibold text-gray-900">
						{$t('statistics.huntConversionFunnel')}
					</h4>
					{#if isRecentlyActivated}
						<Alert.Root class="border-amber-200 bg-amber-50 text-amber-900">
							<Alert.Title>{$t('statistics.autoOffersNoticeTitle')}</Alert.Title>
							<Alert.Description>{$t('statistics.autoOffersNoticeDesc')}</Alert.Description>
						</Alert.Root>
					{/if}
					{#if isLoading}
						<div class="flex items-center justify-center py-8">
							<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
						</div>
					{:else}
						<div class="grid grid-cols-3 gap-4">
							{#each funnelData as item}
								<div class="flex flex-col gap-2 rounded-md border p-4">
									<h5 class="text-sm font-medium text-gray-500">
										{$t(`${item.name}`)}
									</h5>
									<p class="text-3xl font-semibold text-gray-900">{item.value}</p>
								</div>
							{/each}
						</div>
					{/if}

					<Separator class="mb-2" />
					<h4 class="text-xl font-semibold text-gray-900">{$t('statistics.candidates')}</h4>

					<!-- Controls for showing all interested candidates -->
					{#if interestedCandidates.some((c) => c.dateReadyForRecruiter === null)}
						<div class="flex items-center rounded-lg border bg-gray-50 p-4">
							<div class="flex items-center space-x-3">
								<input
									type="checkbox"
									id="showAllCandidates"
									bind:checked={showAllInterestedCandidates}
									class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
								/>
								<label for="showAllCandidates" class="text-sm font-medium text-gray-700">
									{$t('statistics.showAllInterestedCandidates')}
								</label>
							</div>
						</div>
					{/if}

					<div class="flex flex-col gap-4">
						{#if isLoadingCandidates}
							<div class="flex flex-col items-center justify-center gap-6 py-8">
								<Loader2 class="h-10 w-10 animate-spin text-primary/70" />
							</div>
						{:else if interestedCandidates.length === 0}
							<div class="flex flex-col items-center gap-6 py-8">
								<!-- Animated search icon with pulsing effect -->
								<div class="relative">
									<!-- Outer pulsing ring -->
									<div class="absolute inset-0 animate-pulse rounded-full bg-slate-200/40"></div>
									<div
										class="absolute inset-2 animate-pulse rounded-full bg-slate-300/30"
										style="animation-delay: 0.5s;"
									></div>

									<!-- Main search icon container -->
									<div
										class="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-slate-400 to-slate-500 shadow-lg"
									>
										<Sparkle
											fill="currentColor"
											strokeWidth="1"
											class="h-8 w-8 animate-[spin_4s_linear_infinite] text-white"
										/>
									</div>

									<!-- Floating recruitment icons -->
									<div
										class="absolute -right-2 -top-2 flex h-6 w-6 animate-bounce items-center justify-center rounded-full bg-emerald-400"
										style="animation-delay: 0.2s;"
									>
										<Users class="h-3 w-3 text-white" />
									</div>
									<div
										class="absolute -bottom-1 -left-1 flex h-5 w-5 animate-bounce items-center justify-center rounded-full bg-amber-400"
										style="animation-delay: 0.7s;"
									>
										<Users class="h-2.5 w-2.5 text-white" />
									</div>
									<div
										class="absolute -left-2 -top-1 flex h-5 w-5 animate-bounce items-center justify-center rounded-full bg-blue-400"
										style="animation-delay: 1.2s;"
									>
										<Mail class="h-2.5 w-2.5 text-white" />
									</div>
									<div
										class="absolute -bottom-2 -right-1 flex h-4 w-4 animate-bounce items-center justify-center rounded-full bg-purple-400"
										style="animation-delay: 1.5s;"
									>
										<Phone class="h-2 w-2 text-white" />
									</div>
									<div
										class="absolute -right-4 top-2 flex h-4 w-4 animate-bounce items-center justify-center rounded-full bg-teal-400"
										style="animation-delay: 0.9s;"
									>
										<GraduationCap class="h-2 w-2 text-white" />
									</div>
									<div
										class="absolute -bottom-3 left-2 flex h-4 w-4 animate-bounce items-center justify-center rounded-full bg-rose-400"
										style="animation-delay: 1.8s;"
									>
										<Briefcase class="h-2 w-2 text-white" />
									</div>
								</div>

								<!-- Text content -->
								<div class="space-y-2 text-center">
									<h3 class="text-xl font-semibold text-gray-900">
										{$t('statistics.noInterestedCandidates')}
									</h3>
									<p class="max-w-md text-sm text-gray-500">
										{$t('statistics.noInterestedCandidatesDesc')}
									</p>
								</div>
							</div>
						{:else}
							<div class="grid gap-4">
								{#each interestedCandidates.filter((c) => showAllInterestedCandidates || c.dateReadyForRecruiter !== null) as candidate}
									<Card.Root
										class="cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
										onclick={() => {
											showInterestedWorkerDialog = true;
											selectedCandidateId = candidate.candidateId;
											selectedCandidateType = candidate.type;
										}}
									>
										<Card.Content class="p-4">
											<div class="flex items-start gap-4">
												<Avatar.Root class="h-12 w-12 bg-primary/10 text-primary">
													<Avatar.Fallback>
														{candidate.firstName.charAt(0)}{candidate.lastName.charAt(0)}
													</Avatar.Fallback>
												</Avatar.Root>

												<div class="flex-1 space-y-1">
													<div class="flex items-start justify-between">
														<div class="flex flex-col gap-1">
															<h3 class="text-base font-medium">
																{candidate.firstName}
																{candidate.lastName}
															</h3>
														</div>
														<div class="flex flex-col items-end gap-2">
															<div class="flex items-center gap-2">
																{#if candidate.stats}
																	<Tooltip.Root>
																		<Tooltip.Trigger>
																			<div class="flex items-center gap-1 text-xs">
																				<Eye class="h-3.5 w-3.5" />
																				<span>{candidate.stats.offerOpens}</span>
																			</div>
																		</Tooltip.Trigger>
																		<Tooltip.Content side="bottom">
																			<span>{$t('statistics.offerOpens')}</span>
																		</Tooltip.Content>
																	</Tooltip.Root>
																	<span class="text-muted-foreground">|</span>
																	<Tooltip.Root>
																		<Tooltip.Trigger>
																			<div class="flex items-center gap-1 text-xs">
																				<MailOpen class="h-3.5 w-3.5" />
																				<span>{candidate.stats.offerEmailOpenedCount}</span>
																			</div>
																		</Tooltip.Trigger>
																		<Tooltip.Content side="bottom">
																			<span>{$t('statistics.offerEmailOpens')}</span>
																		</Tooltip.Content>
																	</Tooltip.Root>
																	<span class="text-muted-foreground">|</span>
																	<Tooltip.Root>
																		<Tooltip.Trigger>
																			<div class="flex items-center gap-1 text-xs">
																				<MessageSquare class="h-3.5 w-3.5" />
																				<span>{candidate.totalMessages}</span>
																				{#if candidate.hasUnreadMessages}
																					<span
																						class="ml-1 inline-block h-2 w-2 rounded-full bg-red-500"
																					></span>
																				{/if}
																			</div>
																		</Tooltip.Trigger>
																		<Tooltip.Content side="bottom">
																			<span>{$t('statistics.totalChatMessages')}</span>
																		</Tooltip.Content>
																	</Tooltip.Root>
																{/if}
																{#if candidate.dateReadyForRecruiter === null}
																	<span
																		class="w-fit rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800"
																	>
																		{$t('dashboard.interestedWorkerDialog.pendingConfirmation')}
																	</span>
																{:else if candidate.status}
																	<span
																		class="w-fit rounded-full px-2 py-1 text-xs font-medium
																		{candidate.status.toLowerCase() === 'interested'
																			? 'bg-blue-100 text-blue-800'
																			: candidate.status.toLowerCase() === 'offer_made'
																				? 'bg-yellow-100 text-yellow-800'
																				: candidate.status.toLowerCase() === 'hired'
																					? 'bg-green-100 text-green-800'
																					: candidate.status.toLowerCase() === 'declined' ||
																						  candidate.status.toLowerCase() === 'rejected'
																						? 'bg-red-100 text-red-800'
																						: 'bg-gray-100 text-gray-800'}"
																	>
																		{$t(
																			`dashboard.interestedWorkerDialog.status.${candidate.status.toLowerCase()}`
																		)}
																	</span>
																{/if}
																<Badge variant="outline" class="text-xs">
																	{$t(
																		candidate.type === 'apply'
																			? 'statistics.appliedOn'
																			: 'statistics.interestedOn'
																	)}
																	{formatDate(candidate.dateInterested)}
																</Badge>
															</div>
														</div>
													</div>

													<div class="flex gap-4 text-sm text-muted-foreground">
														<div class="flex items-center gap-1">
															<Mail class="h-3.5 w-3.5" />
															<span>{candidate.email}</span>
														</div>
														{#if candidate.phone}
															<div class="flex items-center gap-1">
																<Phone class="h-3.5 w-3.5" />
																<span>{candidate.phone}</span>
															</div>
														{/if}
													</div>
												</div>
											</div>
										</Card.Content>
									</Card.Root>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</div>
		</Tabs.Content>
		<Tabs.Content value="questions">
			<div class="rounded-md bg-blue-50/80 p-4">
				<div class="rounded-md bg-white p-4 shadow-sm">
					<h4 class="text-xl font-semibold text-gray-900">{$t('questions.contextQuestions')}</h4>
					<p class="mb-6 text-sm text-muted-foreground">
						{$t('questions.contextQuestionsDesc')}
					</p>
					<QuestionsInHunt huntId={hunt.huntId} />
				</div>
			</div>
		</Tabs.Content>
		<Tabs.Content value="agent_chat">
			<div class="rounded-md bg-blue-50/80 p-4">
				<div class="rounded-md bg-white p-4 shadow-sm">
					<RequirementsChat chatSessionId={null} />
				</div>
			</div>
		</Tabs.Content>
	</Tabs.Root>

	<!-- Complete confirmation dialog -->
	<Dialog.Root bind:open={isCompleteDialogOpen}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>{$t('hunt.completeDialog.title')}</Dialog.Title>
				<Dialog.Description>
					{$t('hunt.completeDialog.description')}
				</Dialog.Description>
			</Dialog.Header>
			<div class="mt-4 flex justify-end gap-2">
				<Button variant="outline" onclick={() => (isCompleteDialogOpen = false)}
					>{$t('hunt.actions.cancel')}</Button
				>
				<Button variant="default" disabled={isCompleting} onclick={completeCurrentHunt}>
					{#if isCompleting}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{$t('hunt.actions.completing')}
					{:else}
						{$t('hunt.actions.confirm')}
					{/if}
				</Button>
			</div>
		</Dialog.Content>
	</Dialog.Root>

	<!-- Cancel confirmation dialog -->
	<Dialog.Root bind:open={isCancelDialogOpen}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>{$t('hunt.cancelDialog.title')}</Dialog.Title>
				<Dialog.Description>
					{$t('hunt.cancelDialog.description')}
				</Dialog.Description>
			</Dialog.Header>
			<div class="mt-4 flex justify-end gap-2">
				<Button variant="outline" onclick={() => (isCancelDialogOpen = false)}
					>{$t('hunt.actions.back')}</Button
				>
				<Button
					variant="outline"
					class="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
					disabled={isCancelling}
					onclick={cancelCurrentHunt}
				>
					{#if isCancelling}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{$t('hunt.actions.cancelling')}
					{:else}
						{$t('hunt.actions.confirm')}
					{/if}
				</Button>
			</div>
		</Dialog.Content>
	</Dialog.Root>

	<!-- Pause confirmation dialog -->
	<Dialog.Root bind:open={isPauseDialogOpen}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>{$t('hunt.pauseDialog.title')}</Dialog.Title>
				<Dialog.Description>
					{$t('hunt.pauseDialog.description')}
				</Dialog.Description>
			</Dialog.Header>
			<div class="mt-4 flex justify-end gap-2">
				<Button variant="outline" onclick={() => (isPauseDialogOpen = false)}
					>{$t('hunt.actions.back')}</Button
				>
				<Button variant="default" disabled={isPausing} onclick={pauseCurrentHunt}>
					{#if isPausing}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{$t('hunt.actions.completing')}
					{:else}
						{$t('hunt.actions.confirm')}
					{/if}
				</Button>
			</div>
		</Dialog.Content>
	</Dialog.Root>
</div>
