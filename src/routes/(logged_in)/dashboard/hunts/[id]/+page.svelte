<script lang="ts">
	function formatStateProvinceRegion(value: string | string[] | undefined): string {
		if (!value) return '';
		return Array.isArray(value) ? value.join(', ') : String(value);
	}
	import RequirementsChat from '$lib/components/requirements/RequirementsChat.svelte';
	import RequirementsDetails from '$lib/components/requirements/RequirementsDetails.svelte';
	import { page } from '$app/state';
	import PaymentDialog from '$lib/components/payment/paymentDialog.svelte';
	import * as Avatar from '$lib/components/ui/avatar';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { t } from '$lib/i18n';
	import type { HuntStats, InterestedCandidate } from '$lib/scrubinClient';
	import { scrubinClient } from '$lib/scrubinClient/client';
	import InterestedWorkerDialog from '@/components/dashboard/interestedWorkerDialog.svelte';
	import QuestionsInHunt from '@/components/dashboard/questionsInHunt.svelte';
	import { getStatusColor } from '@/components/payment/payments.js';
	import Separator from '@/components/ui/separator/separator.svelte';
	import { Input } from '$lib/components/ui/input';
	import {
		ArrowLeft,
		Briefcase,
		Currency,
		DollarSign,
		FileText,
		GraduationCap,
		Loader2,
		Mail,
		MapPin,
		Pencil,
		Phone,
		Save,
		Search,
		Sparkle,
		Users
	} from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import DropdownComponent from '@/components/dropdownComponent.svelte';
	import type { Currency as Cur } from '$lib/scrubinClient';

	let { data } = $props();
	let hunt = $derived(data.hunt);
	let interestedCandidates = $state<InterestedCandidate[]>([]);
	let isLoading = $state(true);
	let showInterestedWorkerDialog = $state(false);
	let selectedCandidateId = $state(0);
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

	function toggleEditMode() {
		isEditMode = !isEditMode;

		// If exiting edit mode without saving, reset values
		if (!isEditMode) {
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
	}

	async function saveManualEdits() {
		if (!hunt.huntId) {
			toast.error('No hunt ID available.');
			return;
		}

		isSaving = true;

		try {
			const response = await scrubinClient.hunt.updateRequirementFields(hunt.requirements.id, {
				jobTitle: editableRequirements.jobTitle,
				jobDescription: editableRequirements.jobDescription,
				jobRequiredQualifications: editableRequirements.jobRequiredQualifications,
				jobRequiredWorkExperience: editableRequirements.jobRequiredWorkExperience,
				salaryAmountStart: editableRequirements.salaryStart,
				salaryAmountEnd: editableRequirements.salaryEnd,
				salaryCurrency: editableRequirements.salaryCurrency,
				country: editableRequirements.country,
				city: editableRequirements.city,
				stateProvinceRegion:
					typeof editableRequirements.stateProvinceRegion === 'string'
						? [editableRequirements.stateProvinceRegion]
						: editableRequirements.stateProvinceRegion
			});

			hunt.requirements = response;
			// Exit edit mode
			isEditMode = false;
			toast.success('Requirements updated successfully');
		} catch (error) {
			console.error('Failed to save manual edits:', error);
			toast.error('Failed to update requirements. Please try again.', {
				description: (error as Error).message
			});
		} finally {
			isSaving = false;
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

	onMount(async () => {
		try {
			// Fetch interested candidates
			interestedCandidates = await scrubinClient.hunt.getInterestedCandidates(hunt.huntId);

			// Fetch latest stats
			const stats = await scrubinClient.hunt.getHuntStats(hunt.huntId);
			funnelStats = {
				huntId: stats.huntId,
				totalHuntables: stats.totalHuntables || 0,
				totalHuntablesContacted: stats.totalHuntablesContacted || 0,
				totalHuntablesInterested: stats.totalHuntablesInterested || 0,
				totalInterestedReadyForCompany: stats.totalInterestedReadyForCompany || 0,
				totalOffersMade: stats.totalOffersMade || 0,
				totalHired: stats.totalHired || 0
			};

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

			availableCurrencies = await scrubinClient.company.getCurrencies();
			availableCountries = await scrubinClient.company.getCountries();
		} catch (error) {
			console.error('Failed to fetch data:', error);
		} finally {
			isLoading = false;
		}
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
		console.log(hunt);
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
			console.log(hunt);
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
					{#if hunt.status === 'PENDING' || hunt.status === 'AWAITING_PAYMENT'}
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
					{:else}
						<Badge
							variant="outline"
							class="px-3 py-1 {getStatusColor(hunt.status)} border-transparent"
						>
							{$t(`hunt.huntStatus.${hunt.status.toLowerCase()}`)}
						</Badge>
					{/if}
				</div>

				{#if hunt.planType === 'success_fee'}
					<div class="rounded-lg bg-white p-4 shadow-sm">
						<div class="grid grid-cols-2 gap-6">
							{#if hunt.startFee?.amount > 0}
								<div class="flex items-center space-x-4 rounded-lg border p-4">
									<div class="rounded-full bg-primary/5 p-2">
										<DollarSign class="h-5 w-5 text-primary" />
									</div>
									<div>
										<p class="text-sm text-muted-foreground">{$t('payment.startFee')}</p>
										<p class="text-lg font-semibold">
											{hunt.startFee.amount}
											{hunt.startFee.currency}
										</p>
									</div>
								</div>
							{/if}
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

				{#if false}
					<div class="rounded-md bg-white p-4 shadow-sm">
						<div class="mb-4 flex items-center justify-between">
							<h2 class="text-xl font-medium">{$t('hunt.jobRequirements')}</h2>
							<Button
								variant={isEditMode ? 'default' : 'outline'}
								size="sm"
								onclick={isEditMode ? saveManualEdits : toggleEditMode}
								class="flex items-center gap-2"
							>
								{#if isEditMode}
									{#if isSaving}
										<Loader2 class="h-4 w-4 animate-spin" />
										{$t('dashboard.chatWindow.saving')}
									{:else}
										<Save class="h-4 w-4" />
										{$t('dashboard.chatWindow.save')}
									{/if}
								{:else}
									<Pencil class="h-4 w-4" />
									{$t('common.edit')}
								{/if}
							</Button>
						</div>
						<div class="space-y-3">
							<div class="grid grid-cols-1 gap-4 border-b pb-3 text-sm">
								<div class="grid w-full grid-cols-[150px_1fr] items-start">
									<h4 class="font-semibold">{$t('hunt.jobTitle')}</h4>
									{#if isEditMode}
										<Input
											type="text"
											value={editableRequirements.jobTitle}
											onchange={(e) => {
												editableRequirements.jobTitle = e.currentTarget.value;
											}}
											class="transition-all duration-200 focus:ring-primary/30"
										/>
									{:else}
										<p class={hunt.requirements.jobTitle ? 'text-gray-900' : 'text-gray-500'}>
											{hunt.requirements.jobTitle || $t('hunt.notSpecified')}
										</p>
									{/if}
								</div>

								<div class="grid w-full grid-cols-[150px_1fr] items-start">
									<h4 class="font-semibold">{$t('hunt.jobDescription')}</h4>
									{#if isEditMode}
										<textarea
											value={editableRequirements.jobDescription}
											onchange={(e) => {
												editableRequirements.jobDescription = e.currentTarget.value;
											}}
											class="min-h-[100px] w-full rounded-md border p-2 text-sm transition-all duration-200 focus:border-primary/50 focus:ring-primary/30"
										></textarea>
									{:else}
										<p class={hunt.requirements.jobDescription ? 'text-gray-900' : 'text-gray-500'}>
											{hunt.requirements.jobDescription || $t('hunt.notSpecified')}
										</p>
									{/if}
								</div>

								<div class="grid w-full grid-cols-[150px_1fr] items-start">
									<h4 class="font-semibold">{$t('hunt.professions')}</h4>
									<div class="flex flex-row flex-wrap gap-2">
										{#each hunt.requirements.professions || [] as profession}
											<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
												>{profession}</span
											>
										{/each}
									</div>
								</div>
							</div>

							<div class="grid grid-cols-1 gap-4 text-sm">
								<div class="grid w-full grid-cols-[150px_1fr] items-start">
									<h4 class="font-semibold">{$t('hunt.specialization')}</h4>
									<p class={hunt.requirements.specialization ? 'text-gray-900' : 'text-gray-500'}>
										{hunt.requirements.specialization || $t('hunt.notSpecified')}
									</p>
								</div>

								<div class="grid w-full grid-cols-[150px_1fr] items-start">
									<h4 class="font-semibold">{$t('hunt.workExperience')}</h4>
									{#if isEditMode}
										<Input
											type="number"
											min="0"
											value={editableRequirements.jobRequiredWorkExperience}
											onchange={(e) => {
												editableRequirements.jobRequiredWorkExperience =
													parseInt(e.currentTarget.value) || 0;
											}}
											class="w-20 transition-all duration-200 focus:ring-primary/30"
										/>
									{:else}
										<p
											class={hunt.requirements.jobRequiredWorkExperience
												? 'text-gray-900'
												: 'text-gray-500'}
										>
											{hunt.requirements.jobRequiredWorkExperience || 0}
											{$t('hunt.years')}
										</p>
									{/if}
								</div>

								<div class="grid w-full grid-cols-[150px_1fr] items-start">
									<h4 class="font-semibold">{$t('hunt.location')}</h4>
									{#if isEditMode}
										<div class="flex flex-col gap-2">
											<DropdownComponent
												options={availableCountries}
												value={editableRequirements.country}
												justString={true}
												onValueChange={(value) => {
													editableRequirements.country = value;
												}}
												placeholder="Country"
												optionKey="code"
												labelKey="name"
											/>

											<Input
												type="text"
												placeholder="City"
												value={editableRequirements.city}
												onchange={(e) => {
													editableRequirements.city = e.currentTarget.value;
												}}
												class="transition-all duration-200 focus:ring-primary/30"
											/>
											<Input
												type="text"
												placeholder="State/Province/Region"
												value={typeof editableRequirements.stateProvinceRegion === 'string'
													? editableRequirements.stateProvinceRegion
													: editableRequirements.stateProvinceRegion[0] || ''}
												onchange={(e) => {
													editableRequirements.stateProvinceRegion = e.currentTarget.value;
												}}
												class="transition-all duration-200 focus:ring-primary/30"
											/>
										</div>
									{:else}
										<p
											class={hunt.requirements.address?.city ||
											hunt.requirements.address?.stateProvinceRegion
												? 'text-gray-900'
												: 'text-gray-500'}
										>
											{hunt.requirements.country},
											{hunt.requirements.address?.city || ''}
											{formatStateProvinceRegion(hunt.requirements.address?.stateProvinceRegion)}
										</p>
									{/if}
								</div>

								<div class="grid w-full grid-cols-[150px_1fr] items-start">
									<h4 class="font-semibold">{$t('hunt.workTime')}</h4>
									<p class={hunt.requirements.workTimeType ? 'text-gray-900' : 'text-gray-500'}>
										{hunt.requirements.workTimeType?.join(', ') || $t('hunt.notSpecified')}
									</p>
								</div>

								<div class="grid w-full grid-cols-[150px_1fr] items-start">
									<h4 class="font-semibold text-gray-900">{$t('hunt.languages')}</h4>
									<div class="flex flex-wrap gap-1">
										{#each hunt.requirements.jobRequiredLanguages || [] as language}
											<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
												>{language}</span
											>
										{/each}
									</div>
								</div>

								<div class="grid w-full grid-cols-[150px_1fr] items-start">
									<h4 class="font-semibold">{$t('hunt.salary')}</h4>
									{#if isEditMode}
										<div class="flex items-center gap-2">
											<Input
												type="number"
												placeholder="Start"
												value={editableRequirements.salaryStart}
												onchange={(e) => {
													editableRequirements.salaryStart = parseFloat(e.currentTarget.value) || 0;
												}}
												class="w-24 transition-all duration-200 focus:ring-primary/30"
											/>
											<span>-</span>
											<Input
												type="number"
												placeholder="End"
												value={editableRequirements.salaryEnd}
												onchange={(e) => {
													editableRequirements.salaryEnd = parseFloat(e.currentTarget.value) || 0;
												}}
												class="w-24 transition-all duration-200 focus:ring-primary/30"
											/>

											<DropdownComponent
												options={availableCurrencies}
												value={editableRequirements.salaryCurrency}
												showLabelInBrackets={true}
												onValueChange={(value) => {
													editableRequirements.salaryCurrency = value;
												}}
												placeholder="Currency"
												optionKey="code"
												labelKey="name"
											/>
										</div>
									{:else}
										<p
											class={hunt.requirements.salary?.amountStart ||
											hunt.requirements.salary?.amountEnd
												? 'text-gray-900'
												: 'text-gray-500'}
										>
											{#if hunt.requirements.salary?.amountStart && hunt.requirements.salary?.amountEnd}
												{hunt.requirements.salary.amountStart} - {hunt.requirements.salary
													.amountEnd}
												{hunt.requirements.salary.currency || ''} ({hunt.requirements.salary.type ||
													''})
											{:else}
												{hunt.requirements.salary?.amountText || $t('hunt.notSpecified')}
											{/if}
										</p>
									{/if}
								</div>
							</div>

							<div class="mt-4 border-t pt-3">
								<h4 class="mb-4 text-xl font-medium">{$t('hunt.requiredQualifications')}</h4>
								{#if isEditMode}
									<textarea
										value={editableRequirements.jobRequiredQualifications}
										onchange={(e) => {
											editableRequirements.jobRequiredQualifications = e.currentTarget.value;
										}}
										class="min-h-[100px] w-full rounded-md border p-2 text-sm transition-all duration-200 focus:border-primary/50 focus:ring-primary/30"
									></textarea>
								{:else}
									<p
										class="{hunt.requirements.jobRequiredQualifications
											? 'text-gray-900'
											: 'text-gray-500'} text-sm"
									>
										{hunt.requirements.jobRequiredQualifications || $t('hunt.notSpecified')}
									</p>
								{/if}
							</div>

							<div class="border-t pt-3">
								<h4 class="mb-4 text-xl font-medium">{$t('hunt.additionalRequirements')}</h4>
								<div class="mt-1 grid grid-cols-1 gap-2 text-sm">
									<div class="grid w-full grid-cols-[150px_1fr] items-start">
										<h4 class="font-semibold">{$t('hunt.drivingLicense')}</h4>
										<p
											class={hunt.requirements.extras?.drivingLicenceRequired
												? 'text-gray-900'
												: 'text-gray-500'}
										>
											{hunt.requirements.extras?.drivingLicenceRequired
												? $t('hunt.required')
												: $t('hunt.notRequired')}
										</p>
									</div>

									<div class="grid w-full grid-cols-[150px_1fr] items-start">
										<h4 class="font-semibold">{$t('hunt.personalCar')}</h4>
										<p
											class={hunt.requirements.extras?.personalCarRequired
												? 'text-gray-900'
												: 'text-gray-500'}
										>
											{hunt.requirements.extras?.personalCarRequired
												? $t('hunt.required')
												: $t('hunt.notRequired')}
										</p>
									</div>

									{#if hunt.requirements.extras?.accommodationCompensationType}
										<div class="grid w-full grid-cols-[150px_1fr] items-start">
											<h4 class="font-semibold">{$t('hunt.accommodation')}</h4>
											<p
												class={hunt.requirements.extras?.accommodationCompensationType
													? 'text-gray-900'
													: 'text-gray-500'}
											>
												{hunt.requirements.extras?.accommodationCompensationType}
											</p>
										</div>
									{/if}

									{#if hunt.requirements.extras?.transportCompensationType}
										<div class="grid w-full grid-cols-[150px_1fr] items-start">
											<h4 class="font-semibold">{$t('hunt.transport')}</h4>
											<p
												class={hunt.requirements.extras?.transportCompensationType
													? 'text-gray-900'
													: 'text-gray-500'}
											>
												{hunt.requirements.extras?.transportCompensationType}
											</p>
										</div>
									{/if}
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</Tabs.Content>
		<Tabs.Content value="statistics">
			<div class="rounded-md bg-blue-50/80 p-4">
				<div class="flex flex-col gap-4 rounded-md bg-white p-4">
					<h4 class="text-xl font-semibold text-gray-900">
						{$t('statistics.huntConversionFunnel')}
					</h4>
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

					<div class="flex flex-col gap-4">
						{#if isLoading}
							<div class="flex items-center justify-center py-8">
								<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
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
								{#each interestedCandidates as candidate}
									<Card.Root
										class="cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
										onclick={() => {
											showInterestedWorkerDialog = true;
											selectedCandidateId = candidate.candidateId;
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
																{#if candidate.status}
																	<span
																		class="w-fit rounded-full px-2 py-1 text-xs font-medium
																		{candidate.status.toLowerCase() === 'interested'
																			? 'bg-blue-100 text-blue-800'
																			: candidate.status.toLowerCase() === 'offer_made'
																				? 'bg-yellow-100 text-yellow-800'
																				: candidate.status.toLowerCase() === 'hired'
																					? 'bg-green-100 text-green-800'
																					: candidate.status.toLowerCase() === 'declined'
																						? 'bg-red-100 text-red-800'
																						: 'bg-gray-100 text-gray-800'}"
																	>
																		{$t(
																			`dashboard.interestedWorkerDialog.status.${candidate.status.toLowerCase()}`
																		)}
																	</span>
																{/if}
																<Badge variant="outline" class="text-xs">
																	{$t('statistics.interestedOn')}
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
</div>
