<script lang="ts">
	import { goto } from '$app/navigation';
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
	import { t, locale } from '$lib/i18n';
	import { get } from 'svelte/store';
	import type { Currency as Cur, HuntStats, InterestedCandidate } from '$lib/scrubinClient';
	import { scrubinClient } from '$lib/scrubinClient/client';
	import InterestedWorkerDialog from '@/components/dashboard/interestedWorkerDialog.svelte';
	import QuestionsInHunt from '@/components/dashboard/questionsInHunt.svelte';
	import { getStatusColor } from '@/components/payment/payments.js';
	import { getStatusConfig } from '$lib/config/pipelineStatuses';
	import * as Dialog from '@/components/ui/dialog/index.js';
	import * as DropdownMenu from '@/components/ui/dropdown-menu/index.js';
	import Separator from '@/components/ui/separator/separator.svelte';
	import {
		ArrowLeft,
		Bell,
		Briefcase,
		CheckCircle2,
		ChevronDown,
		Clock,
		DollarSign,
		Eye,
		FileText,
		GraduationCap,
		Info,
		Loader2,
		Mail,
		MailOpen,
		MessageSquare,
		Phone,
		Sparkle,
		UserCheck,
		UserCog,
		UserMinus,
		UserPlus,
		UserX,
		Users,
		XCircle
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
	let selectedPipelineStatus = $state<string | null>(null);
	let isLoading = $state(true);
	let isLoadingCandidates = $state(false);
	let unansweredQuestionsCount = $state(0);
	let showInterestedWorkerDialog = $state(false);
	let selectedCandidateId = $state(0);
	let selectedCandidateType = $state<'offer' | 'apply'>('offer');
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
			await scrubinClient.hunt
				.getInterestedCandidates(hunt.huntId)
				.then((candidates) => {
					const allCandidates = [...candidates];
					interestedCandidates = allCandidates.sort((a, b) => {
						const dateA =
							a.dateLastUserAction instanceof Date
								? a.dateLastUserAction.getTime()
								: new Date(a.dateLastUserAction).getTime();
						const dateB =
							b.dateLastUserAction instanceof Date
								? b.dateLastUserAction.getTime()
								: new Date(b.dateLastUserAction).getTime();
						return dateB - dateA; // Descending order (most recent first)
					});
				})
				.catch((error) => {
					toast.error($t('errors.fetchCandidatesFailed'));
				})
				.finally(() => {
					isLoadingCandidates = false;
				});

			// Check URL for candidateId and open dialog if present (after candidates are loaded)
			const candidateIdParam = page.url.searchParams.get('candidateId');
			if (candidateIdParam) {
				const candidateIdNum = parseInt(candidateIdParam);
				const candidateExists = interestedCandidates.find(
					(candidate) => candidate.candidateId === candidateIdNum
				);
				if (candidateExists) {
					selectedCandidateId = candidateIdNum;
					selectedCandidateType = candidateExists.type;
					showInterestedWorkerDialog = true;
					activeTab = 'statistics';
				}
			}

			// Fetch latest stats
			scrubinClient.hunt.getHuntStats(hunt.huntId).then((stats) => {
				if (stats.totalInterestedReadyForCompany > 0) {
					activeTab = 'statistics';
				}
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

	// Track the last candidateId we set in URL to prevent loops
	let lastUrlCandidateId = $state<string | null>(null);
	// Flag to prevent effects from running during URL updates
	let isUpdatingUrl = $state(false);

	// Function to update URL with candidateId - called explicitly on user actions
	function updateUrlWithCandidateId(candidateId: number | null) {
		if (isUpdatingUrl) return; // Prevent re-entrancy

		isUpdatingUrl = true;
		const currentUrl = new URL(page.url);
		const newCandidateIdStr = candidateId && candidateId > 0 ? candidateId.toString() : null;

		if (newCandidateIdStr) {
			currentUrl.searchParams.set('candidateId', newCandidateIdStr);
		} else {
			currentUrl.searchParams.delete('candidateId');
		}

		goto(currentUrl.pathname + currentUrl.search, { replaceState: true, noScroll: true })
			.then(() => {
				// Only update lastUrlCandidateId after URL actually updates
				lastUrlCandidateId = newCandidateIdStr;
				isUpdatingUrl = false;
			})
			.catch(() => {
				isUpdatingUrl = false;
			});
	}

	// Handle URL changes from browser navigation (back/forward buttons)
	// This is the ONLY reactive effect - it only syncs FROM URL to dialog state
	$effect(() => {
		if (isUpdatingUrl) return; // Skip if we're updating URL programmatically

		const urlCandidateId = page.url.searchParams.get('candidateId');

		// If URL matches what we last set, no action needed (we set it, so state should already match)
		if (urlCandidateId === lastUrlCandidateId) {
			return;
		}

		const candidateIdNum = urlCandidateId ? parseInt(urlCandidateId) : 0;

		// URL changed externally (browser navigation) - sync to dialog state
		if (urlCandidateId && candidateIdNum > 0) {
			// Check if we need to update dialog state
			if (candidateIdNum !== selectedCandidateId || !showInterestedWorkerDialog) {
				const candidate = interestedCandidates.find((c) => c.candidateId === candidateIdNum);
				if (candidate) {
					selectedCandidateId = candidateIdNum;
					selectedCandidateType = candidate.type;
					showInterestedWorkerDialog = true;
					activeTab = 'statistics';
					lastUrlCandidateId = urlCandidateId;
				}
			}
		} else if (!urlCandidateId && showInterestedWorkerDialog) {
			// URL doesn't have candidateId but dialog is open - close it (browser back)
			showInterestedWorkerDialog = false;
			lastUrlCandidateId = null;
		}
	});

	// Sync dialog close to URL - watch for dialog closing and update URL
	$effect(() => {
		if (isUpdatingUrl) return; // Skip if we're updating URL programmatically

		// Only update URL when dialog closes (not when it opens, that's handled in onclick)
		if (!showInterestedWorkerDialog) {
			const urlCandidateId = page.url.searchParams.get('candidateId');
			// Only update if URL still has candidateId (user closed dialog, not browser navigation)
			if (urlCandidateId && lastUrlCandidateId !== null) {
				updateUrlWithCandidateId(null);
			}
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
			{ name: 'statistics.initialInterest', value: funnelStats.totalHuntablesInterested },
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

	// Pipeline status configuration - reactive with i18n
	let pipelineStatuses = $derived.by(() => {
		// Reference locale to make this reactive to language changes
		get(locale);
		const translate = get(t);
		return [
			{
				key: 'interested',
				icon: UserPlus,
				color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
				hoverColor: 'hover:bg-emerald-200',
				iconColor: 'text-emerald-600',
				label: translate('statistics.pipelineStatuses.interested.label'),
				description: translate('statistics.pipelineStatuses.interested.description')
			},
			{
				key: 'under_review',
				icon: UserCog,
				color: 'bg-purple-100 text-purple-700 border-purple-300',
				hoverColor: 'hover:bg-purple-200',
				iconColor: 'text-purple-600',
				label: translate('statistics.pipelineStatuses.under_review.label'),
				description: translate('statistics.pipelineStatuses.under_review.description')
			},
			{
				key: 'meeting_scheduled',
				icon: Users,
				color: 'bg-indigo-100 text-indigo-700 border-indigo-300',
				hoverColor: 'hover:bg-indigo-200',
				iconColor: 'text-indigo-600',
				label: translate('statistics.pipelineStatuses.meeting_scheduled.label'),
				description: translate('statistics.pipelineStatuses.meeting_scheduled.description')
			},
			{
				key: 'screening_completed',
				icon: UserCheck,
				color: 'bg-cyan-100 text-cyan-700 border-cyan-300',
				hoverColor: 'hover:bg-cyan-200',
				iconColor: 'text-cyan-600',
				label: translate('statistics.pipelineStatuses.screening_completed.label'),
				description: translate('statistics.pipelineStatuses.screening_completed.description')
			},
			{
				key: 'offer_made',
				icon: FileText,
				color: 'bg-amber-100 text-amber-700 border-amber-300',
				hoverColor: 'hover:bg-amber-200',
				iconColor: 'text-amber-600',
				label: translate('statistics.pipelineStatuses.offer_made.label'),
				description: translate('statistics.pipelineStatuses.offer_made.description')
			},
			{
				key: 'accepted',
				icon: CheckCircle2,
				color: 'bg-green-100 text-green-700 border-green-300',
				hoverColor: 'hover:bg-green-200',
				iconColor: 'text-green-600',
				label: translate('statistics.pipelineStatuses.accepted.label'),
				description: translate('statistics.pipelineStatuses.accepted.description')
			},
			{
				key: 'rejected',
				icon: XCircle,
				color: 'bg-red-100 text-red-700 border-red-300',
				hoverColor: 'hover:bg-red-200',
				iconColor: 'text-red-600',
				label: translate('statistics.pipelineStatuses.rejected.label'),
				description: translate('statistics.pipelineStatuses.rejected.description')
			},
			{
				key: 'declined',
				icon: UserMinus,
				color: 'bg-orange-100 text-orange-700 border-orange-300',
				hoverColor: 'hover:bg-orange-200',
				iconColor: 'text-orange-600',
				label: translate('statistics.pipelineStatuses.declined.label'),
				description: translate('statistics.pipelineStatuses.declined.description')
			},
			{
				key: 'expired',
				icon: Clock,
				color: 'bg-slate-100 text-slate-700 border-slate-300',
				hoverColor: 'hover:bg-slate-200',
				iconColor: 'text-slate-600',
				label: translate('statistics.pipelineStatuses.expired.label'),
				description: translate('statistics.pipelineStatuses.expired.description')
			},
			{
				key: 'cancelled',
				icon: UserX,
				color: 'bg-rose-100 text-rose-700 border-rose-300',
				hoverColor: 'hover:bg-rose-200',
				iconColor: 'text-rose-600',
				label: translate('statistics.pipelineStatuses.cancelled.label'),
				description: translate('statistics.pipelineStatuses.cancelled.description')
			}
		];
	});

	// Computed pipeline data with counts
	let pipelineData = $derived(
		pipelineStatuses.map((status) => ({
			...status,
			count: interestedCandidates.filter(
				(c) => c.status?.toLowerCase() === status.key || (!c.status && status.key === 'interested')
			).length
		}))
	);

	// Filtered candidates based on selected pipeline status
	let filteredCandidates = $derived(
		selectedPipelineStatus
			? interestedCandidates.filter((c) => {
					const candidateStatus = c.status?.toLowerCase() || 'interested';
					return candidateStatus === selectedPipelineStatus;
				})
			: interestedCandidates.filter(
					(c) => showAllInterestedCandidates || c.dateReadyForRecruiter !== null
				)
	);

	// Group candidates by status for "All" view
	let groupedCandidates = $derived(() => {
		const filtered = interestedCandidates.filter(
			(c) => showAllInterestedCandidates || c.dateReadyForRecruiter !== null
		);

		// Key stages that should always be shown
		const keyStages = [
			'interested',
			'under_review',
			'meeting_scheduled',
			'screening_completed',
			'offer_made',
			'accepted'
		];

		return pipelineStatuses.reduce(
			(acc, status) => {
				const candidates = filtered.filter(
					(c) => (c.status?.toLowerCase() || 'interested') === status.key
				);
				// Show if has candidates OR is a key stage
				if (candidates.length > 0 || keyStages.includes(status.key)) {
					acc[status.key] = {
						...status,
						candidates
					};
				}
				return acc;
			},
			{} as Record<string, (typeof pipelineStatuses)[0] & { candidates: InterestedCandidate[] }>
		);
	});

	// Candidates that need action (have needAttention flag)
	let candidatesNeedingAction = $derived(
		interestedCandidates.filter((c) => c.stats.needAttention).length
	);

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
			toast.error($t('errors.activateHuntFailed'));
		}
	}

	function onPaymentSuccess() {
		window.location.reload();
		toast.success($t('errors.paymentSuccess'));
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
<div class="container mx-auto max-w-6xl space-y-6 py-6 2xl:max-w-7xl">
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
			<Tabs.Trigger value="statistics">
				<span>{$t('hunt.statistics')}</span>
				{#if candidatesNeedingAction > 0}
					<span
						class="ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white"
					>
						{candidatesNeedingAction}
					</span>
				{/if}
			</Tabs.Trigger>
			<Tabs.Trigger value="questions">
				<span>{$t('hunt.questions')}</span>
				{#if unansweredQuestionsCount > 0}
					<span
						class="ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-semibold text-white"
					>
						{unansweredQuestionsCount}
					</span>
				{/if}
			</Tabs.Trigger>
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
				<div class="flex flex-col gap-4 rounded-md bg-white p-4 shadow-sm">
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
						<div class="flex flex-col items-center justify-center gap-6 py-8">
							<Loader2 class="h-10 w-10 animate-spin text-primary/70" />
						</div>
					{:else}
						<div class="grid grid-cols-6 gap-2">
							{#each funnelData as item}
								<div class="flex flex-col gap-1.5 rounded-md border p-2.5">
									<div class="flex items-center gap-1.5">
										<h5 class="text-xs font-medium text-gray-500">
											{$t(`${item.name}`)}
										</h5>
										<Tooltip.Root>
											<Tooltip.Trigger>
												<Info class="h-3 w-3 flex-shrink-0 cursor-help text-muted-foreground" />
											</Tooltip.Trigger>
											<Tooltip.Content side="bottom">
												<p class="max-w-[180px] text-xs">{$t(`${item.name}Desc`)}</p>
											</Tooltip.Content>
										</Tooltip.Root>
									</div>
									<p class="text-2xl font-semibold leading-tight text-gray-900">{item.value}</p>
								</div>
							{/each}
						</div>
					{/if}

					<Separator class="mb-2" />

					<!-- Hiring Progress Pipeline -->
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<div>
								<h4 class="text-xl font-semibold text-gray-900">
									{$t('statistics.hiringProgressPipeline')}
								</h4>
								<p class="text-sm text-muted-foreground">
									{$t('statistics.filterCandidatesByStage')}
								</p>
							</div>
							{#if candidatesNeedingAction > 0}
								<Badge variant="destructive" class="h-6">
									{candidatesNeedingAction}
									{$t('statistics.needAction')}
								</Badge>
							{/if}
						</div>

						{#if isLoadingCandidates}
							<div class="flex flex-col items-center justify-center gap-6 py-8">
								<Loader2 class="h-10 w-10 animate-spin text-primary/70" />
							</div>
						{:else if interestedCandidates.length === 0}
							<div class="rounded-lg border border-dashed p-8 text-center">
								<Users class="mx-auto h-12 w-12 text-muted-foreground/50" />
								<p class="mt-2 text-sm text-muted-foreground">
									{$t('statistics.noCandidatesYet')}
								</p>
							</div>
						{:else}
							<!-- Pipeline Status Filters/Tabs -->
							<div class="flex flex-wrap gap-2">
								<!-- All button -->
								<button
									onclick={() => (selectedPipelineStatus = null)}
									class="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-all
									{selectedPipelineStatus === null
										? 'border-primary bg-primary text-primary-foreground shadow-sm'
										: 'border-border bg-background hover:bg-accent hover:text-accent-foreground'}"
								>
									<Users class="h-3.5 w-3.5" />
									{$t('statistics.all')}
									<span
										class="ml-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold
									{selectedPipelineStatus === null
											? 'bg-primary-foreground/20 text-primary-foreground'
											: 'bg-muted text-muted-foreground'}"
									>
										{interestedCandidates.length}
									</span>
								</button>

								{#each pipelineData.filter((s) => s.count > 0 || ['interested', 'under_review', 'meeting_scheduled', 'offer_made', 'accepted'].includes(s.key)) as status}
									{@const Icon = status.icon}
									<Tooltip.Root>
										<Tooltip.Trigger>
											<button
												onclick={() => {
													selectedPipelineStatus =
														selectedPipelineStatus === status.key ? null : status.key;
												}}
												class="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-all
												{selectedPipelineStatus === status.key
													? `${status.color} border-current shadow-sm`
													: 'border-border bg-background hover:bg-accent hover:text-accent-foreground'}"
											>
												<Icon class="h-3.5 w-3.5" />
												<span>{status.label}</span>
												<span
													class="ml-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold
													{selectedPipelineStatus === status.key ? 'bg-current/20' : 'bg-muted text-muted-foreground'}"
												>
													{status.count}
												</span>
												{#if interestedCandidates.filter((c) => c.status?.toLowerCase() === status.key && c.stats.hasUnreadMessages).length > 0}
													<span
														class="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
													>
														{interestedCandidates.filter(
															(c) =>
																c.status?.toLowerCase() === status.key && c.stats.hasUnreadMessages
														).length}
													</span>
												{/if}
											</button>
										</Tooltip.Trigger>
										<Tooltip.Content side="bottom">
											<p class="max-w-xs text-sm">{status.description}</p>
										</Tooltip.Content>
									</Tooltip.Root>
								{/each}
							</div>
						{/if}
					</div>

					<!-- Candidates Section -->
					<div class="mt-6 flex max-w-full flex-col gap-4 overflow-x-auto">
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
						{:else if selectedPipelineStatus === null}
							<!-- Kanban-style column view when "All" is selected -->
							<div class="overflow-x-auto">
								<div class="flex gap-4 pb-4">
									{#each Object.entries(groupedCandidates()) as [statusKey, statusGroup]}
										{@const Icon = statusGroup.icon}
										<div class="flex w-64 flex-shrink-0 flex-col rounded-lg border">
											<!-- Column Header -->
											<div class="border-b px-3 py-2 {statusGroup.color}">
												<div class="flex items-center justify-between">
													<div class="flex items-center gap-2">
														<Icon class="h-3.5 w-3.5 {statusGroup.iconColor}" />
														<h5 class="text-sm font-semibold">{statusGroup.label}</h5>
													</div>
													<span
														class="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold {statusGroup.color}"
													>
														{statusGroup.candidates.length}
													</span>
												</div>
											</div>
											<!-- Column Content -->
											<div class="flex flex-col gap-2 p-3">
												{#if statusGroup.candidates.length === 0}
													<div class="py-8 text-center">
														<p class="text-xs text-muted-foreground">
															{$t('statistics.noCandidates')}
														</p>
													</div>
												{:else}
													{#each statusGroup.candidates as candidate}
														<button
															onclick={() => {
																selectedCandidateId = candidate.candidateId;
																selectedCandidateType = candidate.type;
																showInterestedWorkerDialog = true;
																updateUrlWithCandidateId(candidate.candidateId);
															}}
															class="group relative flex flex-col gap-1.5 rounded-lg border bg-background p-2.5 text-left transition-all hover:border-primary hover:shadow-md {candidate
																.stats.hasUnreadMessages
																? 'border-l-4 border-l-orange-500'
																: ''}"
														>
															{#if candidate.stats.hasUnreadMessages || candidate.stats.needAttention}
																<div
																	class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white shadow-lg ring-2 ring-background"
																>
																	<Bell class="h-3 w-3" />
																</div>
															{/if}

															<!-- Name -->
															<div class="text-sm font-medium">
																{candidate.firstName}
																{candidate.lastName.charAt(0)}.
															</div>

															<!-- Email -->
															<div
																class="flex items-center gap-1 truncate text-xs text-muted-foreground"
															>
																<Mail class="h-3 w-3 flex-shrink-0" />
																<span class="truncate">{candidate.email}</span>
															</div>

															<!-- Stats row -->
															<div
																class="flex items-center justify-between border-t pt-1 text-xs text-muted-foreground"
															>
																<div class="flex items-center gap-2">
																	<Tooltip.Root>
																		<Tooltip.Trigger>
																			<div class="flex items-center gap-0.5">
																				<MessageSquare class="h-3 w-3" />
																				<span>{candidate.totalMessages}</span>
																			</div>
																		</Tooltip.Trigger>
																		<Tooltip.Content>
																			<span>{$t('statistics.messages')}</span>
																		</Tooltip.Content>
																	</Tooltip.Root>

																	<Tooltip.Root>
																		<Tooltip.Trigger>
																			<div class="flex items-center gap-0.5">
																				<Eye class="h-3 w-3" />
																				<span>{candidate.stats.offerOpens}</span>
																			</div>
																		</Tooltip.Trigger>
																		<Tooltip.Content>
																			<span>{$t('statistics.opens')}</span>
																		</Tooltip.Content>
																	</Tooltip.Root>
																</div>

																<span class="text-[10px]">
																	{formatDate(candidate.dateInterested).split(',')[0]}
																</span>
															</div>
														</button>
													{/each}
												{/if}
											</div>
										</div>
									{/each}
								</div>
							</div>
						{:else}
							<!-- Detailed card view when specific status is selected -->
							<div class="grid gap-4">
								{#each filteredCandidates as candidate}
									<Card.Root
										class="cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
										onclick={() => {
											selectedCandidateId = candidate.candidateId;
											selectedCandidateType = candidate.type;
											showInterestedWorkerDialog = true;
											updateUrlWithCandidateId(candidate.candidateId);
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
																				{#if candidate.stats.hasUnreadMessages}
																					<span
																						class="ml-1 inline-flex h-4 w-4 animate-pulse items-center justify-center rounded-full bg-orange-500 text-white"
																					>
																						<Bell class="h-2.5 w-2.5" />
																					</span>
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
																	{@const statusLower = candidate.status.toLowerCase() === 'hired' ? 'accepted' : candidate.status.toLowerCase()}
																	{@const statusConfig = getStatusConfig(statusLower)}
																	{@const StatusIcon = statusConfig?.icon}
																	<span class="w-fit rounded-full px-3 py-1 text-xs font-medium {statusConfig?.color || 'bg-gray-100 text-gray-800'} flex items-center gap-1.5">
																		{#if StatusIcon}
																			<StatusIcon class="h-3.5 w-3.5" />
																		{/if}
																		{$t(`statistics.pipelineStatuses.${statusLower}.label`)}
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
					<QuestionsInHunt
						huntId={hunt.huntId}
						onUnansweredChange={(count) => (unansweredQuestionsCount = count)}
					/>
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
