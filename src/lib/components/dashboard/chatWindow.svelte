<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import type { CompanyPlanSummary, PlanType, RequirementsWithInstructions, Currency } from '@/scrubinClient';
	import { scrubinClient } from '@/scrubinClient/client';
	import { t } from '$lib/i18n';
	import { AlertCircle, Check, ChevronDown, ChevronLeft, Loader2, Sparkle, Pen, X } from 'lucide-svelte';
	import { onMount, tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import PaymentDialog from '../payment/paymentDialog.svelte';
	import ChatWindowDemand from './chatWindowDemand.svelte';
	import { visible } from './overlay';
	import DropdownComponent from '../dropdownComponent.svelte';

	let {
		requirements = $bindable<RequirementsWithInstructions>()
	}: {
		requirements: RequirementsWithInstructions;
	} = $props();

	let companyActivePlans = $state<CompanyPlanSummary[]>([]);
	onMount(async () => {
		companyActivePlans = await scrubinClient.company.getActivePlans();
		availableCurrencies = await scrubinClient.company.getCurrencies();
		availableCountries = await scrubinClient.company.getCountries();
	});

	let currentQuestionIndex = $state(0);
	let answers: Record<string, string> = $state({});
	let currentAnswer = $state('');
	let isSubmitting = $state(false);
	let isComplete = $state(false);
	let isAnalyzing = $state(false);
	let isActivating = $state(false);
	let isEditingPrevious = $state(false);
	let customInstructions = $state('');
	let selectedPlanType = $state<PlanType | null>(null);
	let showPlanActivationMessage = $state(false);
	let availableCurrencies = $state<Currency[]>([]);
	let availableCountries = $state<string[]>([]);

	// Collapsible questions state
	let expandedQuestions = $state(new Set([0])); // Example: first 3 expanded by default

	$effect(() => {
		// Reset answers when requirements change
		if (requirements) {
			answers = {};
			currentQuestionIndex = 0;
			isComplete = true;
			isAnalyzing = false;
			isEditingPrevious = false;
			customInstructions = '';
		}
	});
	function handleNextQuestion() {
		if (!requirements.followUpQuestionsV2) {
			toast.error('No follow-up questions available.');
			return;
		}
		if (currentAnswer.trim()) {
			// Save the current answer
			const currentQuestion = requirements.followUpQuestionsV2[currentQuestionIndex];
			answers[currentQuestion.title] = currentAnswer;
			currentAnswer = '';

			// Move to next question or complete
			if (currentQuestionIndex < requirements.followUpQuestionsV2.length - 1) {
				currentQuestionIndex++;
				// Pre-fill with existing answer if available
				const nextQuestion = requirements.followUpQuestionsV2[currentQuestionIndex];
				currentAnswer = answers[nextQuestion.title] || '';
				// Open the next question in the accordion
				toggleQuestion(currentQuestionIndex - 1);
				toggleQuestion(currentQuestionIndex);
			} else {
				submitAnswers();
			}
		}
	}

	function handlePreviousQuestion() {
		if (currentQuestionIndex > 0) {
			// Save current answer before moving back
			if (currentAnswer.trim()) {
				const currentQuestion = requirements.followUpQuestionsV2?.[currentQuestionIndex];
				if (currentQuestion) {
					answers[currentQuestion.title] = currentAnswer;
				}
			}

			// Move to previous question
			currentQuestionIndex--;

			// Load the previous answer
			const prevQuestion = requirements.followUpQuestionsV2?.[currentQuestionIndex];
			if (prevQuestion) {
				currentAnswer = answers[prevQuestion.title] || '';
				isEditingPrevious = true;
			}
		}
	}

	function goToQuestion(index: number) {
		if (!requirements.followUpQuestionsV2) return;

		if (index >= 0 && index < requirements.followUpQuestionsV2.length) {
			// Save current answer before moving
			if (currentAnswer.trim()) {
				const currentQuestion = requirements.followUpQuestionsV2[currentQuestionIndex];
				answers[currentQuestion.title] = currentAnswer;
			}

			// Move to selected question
			currentQuestionIndex = index;

			// Load the answer for that question
			const question = requirements.followUpQuestionsV2[index];
			currentAnswer = answers[question.title] || '';
			isEditingPrevious = true;
		}
	}

	// Function to handle input changes and automatically move to next question
	function handleAnswerInput(questionIndex: number, value: string) {
		if (!requirements.followUpQuestionsV2) return;

		const question = requirements.followUpQuestionsV2[questionIndex];
		answers[question.title] = value;

		// If this is the current question, update currentAnswer
		if (questionIndex === currentQuestionIndex) {
			currentAnswer = value;
		}
	}

	async function submitAnswers() {
		isSubmitting = true;
		visible.set(true);

		if (!requirements.followUpQuestionsV2 && !customInstructions.trim()) {
			toast.error('No follow-up questions or custom instructions available.');
			return;
		}

		try {
			// Format answers as required
			let formattedAnswers = '';

			if (requirements.followUpQuestionsV2) {
				formattedAnswers = requirements.followUpQuestionsV2
					.map((question) => `${question.title}\nanswer: ${answers[question.title] || ''}`)
					.join('\n');
			}

			// Add custom instructions if provided
			if (customInstructions.trim()) {
				formattedAnswers += formattedAnswers ? '\n\n' : '';
				formattedAnswers += `Additional Instructions:\n${customInstructions.trim()}`;
			}

			// Submit to API
			isAnalyzing = true;
			const response = await scrubinClient.hunt.updateRequirements(
				requirements.requirements.id,
				formattedAnswers
			);
			// Update requirements with the response
			requirements = response;
			await tick();
			isComplete = true;
		} catch (error) {
			console.error('Failed to submit answers:', error);
			toast.error('Failed to submit answers. Please try again.');
		} finally {
			isSubmitting = false;
			isAnalyzing = false;
			visible.set(false);
		}
	}

	let paymentDialogOpen = $state(false);
	let payableHuntId = $state(0);
	let chargeableAmount = $state({
		amount: 0,
		currency: 'EUR',
		vatPercentage: 0,
		vatAmount: 0
	});

	function selectPlan(planType: PlanType) {
		selectedPlanType = planType;

		// Check if plan is active
		if (
			companyActivePlans &&
			!companyActivePlans.some(
				(plan: CompanyPlanSummary) => plan.planType === planType && plan.planActive
			)
		) {
			showPlanActivationMessage = true;
		} else {
			showPlanActivationMessage = false;
		}
	}

	function canBeActivated(
		activePlans: CompanyPlanSummary[],
		selectedPlan: PlanType | null,
		isActivatingNow: boolean
	): boolean {
		// Don't allow activation during ongoing process or without selection
		if (isActivatingNow || !selectedPlan) {
			return false;
		}

		// Check if this plan type is actually activated in company account
		if (
			!activePlans.some(
				(plan: CompanyPlanSummary) => plan.planType === selectedPlan && plan.planActive
			)
		) {
			return false;
		}

		return true;
	}

	async function activateRequirements() {
		if (!requirements.requirements?.id) {
			toast.error('No requirements ID available.');
			return;
		}
		if (!selectedPlanType) {
			toast.error('No plan type selected.');
			return;
		}

		// Don't allow activation if plan isn't activated yet
		if (
			companyActivePlans &&
			!companyActivePlans.some(
				(plan: CompanyPlanSummary) => plan.planType === selectedPlanType && plan.planActive
			)
		) {
			toast.error('Please activate this plan type first in Pricing section.');
			return;
		}

		isActivating = true;

		try {
			const response = await scrubinClient.hunt.createHuntFromRequirements(
				requirements.requirements.id,
				selectedPlanType
			);
			payableHuntId = response.huntId;

			// Check if payment needed
			if (response.planType === 'success_fee' && response.startFee.amount > 0) {
				// Show payment dialog
				chargeableAmount.amount = response.startFee.amount;
				chargeableAmount.currency = response.startFee.currency;
				chargeableAmount.vatPercentage = response.startFee.vatPercentage;
				chargeableAmount.vatAmount = response.startFee.vatAmount;
				paymentDialogOpen = true;
			} else {
				//chargeableAmount.amount = response.successFee.amount;
				//chargeableAmount.currency = response.successFee.currency;
				// No payment needed, go directly to hunt
				onPaymentSuccess(response.huntId);
			}
		} catch (error) {
			console.error('Failed to activate requirements:', error);
			toast.error('Failed to activate requirements. Please try again.');
		} finally {
			isActivating = false;
		}
	}

	function onPaymentSuccess(huntId: number) {
		goto('/dashboard/hunts/' + huntId);
		toast.success('Requirements activated successfully!');
	}

	function toggleQuestion(index: number) {
		if (expandedQuestions.has(index)) {
			expandedQuestions.delete(index);
		} else {
			expandedQuestions.add(index);
		}
		// Force reactivity update in Svelte 5
		expandedQuestions = new Set(expandedQuestions);
	}

	function goBack() {
		window.history.back();
	}

	let editableFields = $state({
	jobTitle: false,
	jobDescription: false,
	jobRequiredQualifications: false,
	jobRequiredWorkExperience: false,
	salaryStart: false,
	salaryEnd: false,
	salaryCurrency: false,
	country: false,
	city: false,
	address: false,
	stateProvinceRegion: false
	});

	let editValues = $state({
	jobTitle: '',
	jobDescription: '',
	jobRequiredQualifications: '',
	jobRequiredWorkExperience: 0,
	salaryStart: 0,
	salaryEnd: 0,
	address: '',
	salaryCurrency: requirements?.requirements.salary?.currency || '',
	country: requirements?.requirements.country || '',
	city: requirements?.requirements.address?.city || '',
	stateProvinceRegion: requirements?.requirements.address?.stateProvinceRegion || []
	});

	let isEditing = $state(false);
	let isSaving = $state(false);

	$effect(() => {
		if (requirements?.requirements) {
			// Initialize edit values from requirements
			editValues = {
				jobTitle: requirements.requirements.jobTitle || '',
				jobDescription: requirements.requirements.jobDescription || '',
				jobRequiredQualifications: requirements.requirements.jobRequiredQualifications || '',
				jobRequiredWorkExperience: requirements.requirements.jobRequiredWorkExperience || 0,
				salaryStart: requirements.requirements.salary?.amountStart || 0,
				salaryEnd: requirements.requirements.salary?.amountEnd || 0,
				salaryCurrency: requirements.requirements.salary?.currency || '',
				country: requirements.requirements.country || '',
				address: requirements.requirements.address.address || '',
				city: requirements.requirements.address?.city || '',
				stateProvinceRegion: requirements.requirements.address?.stateProvinceRegion || []
			};
		}
	});

	async function saveField(field: keyof typeof editableFields) {
		if (!requirements?.requirements?.id) return;
		isSaving = true;
		try {
			let updateData: any = {};
			if (field === 'salaryStart' || field === 'salaryEnd' || field === 'salaryCurrency') {
				// group under salary
				updateData = {
					salaryAmountStart: editValues.salaryStart  ? editValues.salaryStart : requirements.requirements.salary?.amountStart,
					salaryAmountEnd:   editValues.salaryEnd  ? editValues.salaryEnd : requirements.requirements.salary?.amountEnd,
					salaryCurrency:    editValues.salaryCurrency  ? editValues.salaryCurrency : requirements.requirements.salary?.currency
				};
			} else if (field === 'country' || field === 'city' || field === 'stateProvinceRegion') {
				// group under address & country
				updateData = {
					country: editValues.country,
					address: editValues.address,
					city: editValues.city,
					stateProvinceRegion: editValues.stateProvinceRegion
				};
			} else {
				updateData = { [field]: editValues[field] };
			}

			const updatedRequirements = await scrubinClient.hunt.updateRequirementFields(
			requirements.requirements.id,
			updateData
			);
			requirements = { ...requirements, requirements: updatedRequirements };
			Object.keys(editableFields).forEach(key => {
				editableFields[key as keyof typeof editableFields] = false;
			});
			toast.success(`Updated successfully`);
		} catch (error) {
			console.error(`Failed to update ${field}:`, error);
			toast.error(`Failed to update ${field}. Please try again.`);
		} finally {
			isSaving = false;
		}
		}


	function startEditing(field: keyof typeof editableFields) {
		// Close any other open edit fields
		Object.keys(editableFields).forEach(key => {
			editableFields[key as keyof typeof editableFields] = false;
		});
		
		// Open the selected field
		editableFields[field] = true;
		isEditing = true;
	}

	function cancelEditing(field: keyof typeof editableFields) {
		// Reset the field value
		editValues[field] = requirements?.requirements?.[field] || '';
		// Close edit mode
		editableFields[field] = false;
		
		// Check if we're still editing any field
		isEditing = Object.values(editableFields).some(value => value);
	}
</script>

<PaymentDialog
	bind:open={paymentDialogOpen}
	huntId={payableHuntId}
	amount={chargeableAmount.amount}
	currency={chargeableAmount.currency}
	vatPercentage={chargeableAmount.vatPercentage}
	vatAmount={chargeableAmount.vatAmount}
	onSuccess={onPaymentSuccess}
></PaymentDialog>

<!-- 
  Container: use flex-row, narrower left column (md:w-1/3), 
  and a larger right column (md:w-2/3) with a left border for clarity.
-->
<div class="flex w-full flex-col gap-4 rounded bg-blue-50/80 p-4 md:flex-row">
	<!-- Left side: Follow-up Questions -->
	<div class="rounded-md bg-white p-4 shadow-sm md:w-1/3">
		<h2 class="mb-4 flex items-center gap-2 text-lg font-medium text-primary">
			<Button variant="outline" size="icon" onclick={() => goBack()}>
				<ChevronLeft class="h-4 w-4" />
			</Button>

			{$t('dashboard.chatWindow.followUpQuestions')}
		</h2>

		{#if isAnalyzing}
			<div class="flex items-center justify-center rounded-lg bg-blue-50/70 p-4">
				<div class="flex flex-col items-center gap-2">
					<Loader2 class="h-6 w-6 animate-spin text-primary" />
					<p class="text-sm font-medium text-primary/80">{$t('dashboard.chatWindow.analyzing')}</p>
				</div>
			</div>
		{:else if requirements?.canBeActivated}
			<div class="mb-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
				<div class="flex flex-col gap-3">
					<p class="inline-flex items-center gap-2 text-sm font-medium text-primary/90">
						<Sparkle fill="currentColor" strokeWidth="1" class="h-4 w-4 rotate-45 text-blue-500" />
						{isComplete
							? $t('dashboard.chatWindow.readyToActivate')
							: $t('dashboard.chatWindow.completeQuestions')}
					</p>

					{#if requirements.allowedPlanOptions && requirements.allowedPlanOptions.length > 0}
						<div class="mt-2">
							<h3 class="mb-2 text-sm font-medium">
								{$t('dashboard.chatWindow.selectSearchType')}
							</h3>
							<div class="w-full">
								<div class="w-full space-y-2">
									{#each requirements.allowedPlanOptions as planType}
										<Button
											variant={selectedPlanType == planType ? 'default' : 'outline'}
											onclick={() => selectPlan(planType)}
											class="relative w-full capitalize"
										>
											{planType.replace('_', ' ')}
										</Button>
									{/each}
								</div>
							</div>

							{#if showPlanActivationMessage && !canBeActivated(companyActivePlans || [], selectedPlanType, isActivating)}
								<div
									class="mt-2 flex items-center gap-2 rounded bg-amber-50 p-2 text-xs text-amber-600"
								>
									<AlertCircle class="h-4 w-4" />
									<p>{$t('dashboard.chatWindow.activationNeeded')}</p>
								</div>
							{/if}
						</div>
					{/if}

					<Button
						onclick={activateRequirements}
						disabled={!canBeActivated(companyActivePlans || [], selectedPlanType, isActivating)}
						variant={!isComplete ? 'outline' : 'default'}
						size="sm"
						class="mt-2 whitespace-nowrap transition-all duration-300 hover:scale-105"
					>
						{#if isActivating}
							<Loader2 class="mr-2 h-3 w-3 animate-spin" />
							{$t('dashboard.chatWindow.confirming')}
						{:else}
							{$t('dashboard.chatWindow.confirm')}
						{/if}
					</Button>
				</div>
			</div>
			<!-- <ChatWindowPricing hiringPlan={requirements.hiringPlan} /> -->
			<ChatWindowDemand hiringPlan={requirements.hiringPlan} />
		{/if}

		{#if !isAnalyzing && requirements.followUpQuestionsV2 && requirements.followUpQuestionsV2.length > 0}
			<div class="w-full space-y-3">
				{#each requirements.followUpQuestionsV2 as question, i}
					<div
						class="overflow-hidden rounded-lg border transition-all duration-200 {expandedQuestions.has(
							i
						)
							? 'shadow-sm'
							: 'border-gray-100'}"
					>
						<!-- Collapsible question header -->
						<div
							class="flex cursor-pointer items-center justify-between
								p-3 transition-colors duration-200 hover:bg-gray-50"
							onclick={() => toggleQuestion(i)}
						>
							<div class="flex min-w-0 flex-1 items-center gap-3 pr-2">
								<span
									class={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium
									${answers[question.title] ? 'bg-primary text-white' : 'bg-blue-50 text-gray-500'} 
									transition-all duration-300`}
								>
									{answers[question.title] ? '✓' : i + 1}
								</span>
								<span class="overflow-hidden truncate text-sm font-medium text-gray-700">
									{question.title}
								</span>
							</div>
							<span class="flex-shrink-0 text-gray-400 transition-transform duration-200">
								<ChevronDown class="h-4 w-4 {expandedQuestions.has(i) ? 'rotate-180' : ''}" />
							</span>
						</div>

						<!-- Collapsible content -->
						{#if expandedQuestions.has(i)}
							<div class="border-t bg-white p-3">
								<p class="mb-3 text-sm font-medium text-gray-700">{question.title}</p>
								<p class="mb-3 text-sm text-gray-500">{question.description}</p>
								<div class="flex flex-col gap-3">
									<Input
										type="text"
										placeholder="Type your answer here..."
										value={answers[question.title]}
										onchange={(e) => {
											handleAnswerInput(i, e.currentTarget.value);
										}}
										class="transition-all duration-200 focus:ring-primary/30"
									/>
								</div>
							</div>
						{/if}
					</div>
				{/each}

				<!-- Custom Instructions Textarea -->
				<div class="mt-6 overflow-hidden rounded-lg border shadow-sm transition-all duration-200">
					<div class="bg-white p-3">
						<p class="mb-3 text-sm font-medium text-gray-700">
							{$t('dashboard.chatWindow.additionalInstructions')}
						</p>
						<p class="mb-3 text-sm text-gray-500">
							{$t('dashboard.chatWindow.addCustomRequirements')}
						</p>
						<div class="flex flex-col gap-3">
							<textarea
								placeholder={$t('dashboard.chatWindow.additionalInstructionsPlaceholder')}
								value={customInstructions}
								class="min-h-[100px] w-full rounded-md border p-3 text-sm transition-all duration-200 focus:border-primary/50 focus:ring-primary/30"
								onchange={(e) => {
									customInstructions = e.currentTarget.value;
								}}
							></textarea>
						</div>
					</div>
				</div>

				<!-- Single Submit button that's always present -->
				<div class="mt-6 flex justify-end">
					<Button
						onclick={submitAnswers}
						disabled={isSubmitting ||
							(Object.keys(answers).length === 0 && !customInstructions.trim())}
						variant="default"
						size="default"
						class="bg-gradient-to-r from-primary to-primary/90 px-4 transition-all duration-300 hover:scale-105"
					>
						{#if isSubmitting}
							<Loader2 class="h-4 w-4 animate-spin" />
							{$t('dashboard.chatWindow.submitting')}
						{:else}
							<Check class="h-4 w-4" />
							{$t('dashboard.chatWindow.submit')}
						{/if}
					</Button>
				</div>
			</div>
		{:else if !requirements?.followUpQuestionsV2?.length && !requirements?.followUpQuestions?.length}
			<div class="mt-6 overflow-hidden rounded-lg border shadow-sm transition-all duration-200">
				<div class="bg-white p-3">
					<p class="mb-3 text-sm font-medium text-gray-700">
						{$t('dashboard.chatWindow.additionalInstructions')}
					</p>
					<p class="mb-3 text-sm text-gray-500">
						{$t('dashboard.chatWindow.addCustomRequirements')}
					</p>
					<div class="flex flex-col gap-3">
						<textarea
							placeholder={$t('dashboard.chatWindow.additionalInstructionsPlaceholder')}
							value={customInstructions}
							class="min-h-[100px] w-full rounded-md border p-3 text-sm transition-all duration-200 focus:border-primary/50 focus:ring-primary/30"
							onchange={(e) => {
								customInstructions = e.currentTarget.value;
							}}
						></textarea>
					</div>
				</div>
			</div>

			<!-- Single Submit button for no-questions case -->
			<div class="mt-6 flex justify-end">
				<Button
					onclick={submitAnswers}
					disabled={isSubmitting || !customInstructions.trim()}
					variant="default"
					size="default"
					class="bg-gradient-to-r from-primary to-primary/90 px-4 transition-all duration-300 hover:scale-105"
				>
					{#if isSubmitting}
						<Loader2 class="h-4 w-4 animate-spin" />
						{$t('dashboard.chatWindow.submitting')}
					{:else}
						<Check class="h-4 w-4" />
						{$t('dashboard.chatWindow.submit')}
					{/if}
				</Button>
			</div>
		{/if}
	</div>

	<!-- Right side: Job Requirements -->
	<div class="rounded-md bg-white p-4 md:w-2/3">
		<Sparkle fill="currentColor" strokeWidth="1" class="mb-4 h-8 w-8 rotate-45 text-blue-500" />
		<h2 class="mb-4 text-xl font-medium">{$t('dashboard.chatWindow.jobRequirements')}</h2>

		{#if requirements.requirements}
			<div class="space-y-3">
				<div class="grid grid-cols-1 gap-4 border-b pb-3 text-sm">
					<div 
						class="grid w-full grid-cols-[150px_1fr] items-start transition-colors duration-200 hover:bg-gray-50 rounded p-1 pl-0 group"
					>
						<h4 class="font-semibold">{$t('dashboard.chatWindow.jobTitle')}</h4>
						
						{#if editableFields.jobTitle}
							<div class="flex gap-2 w-full">
								<Input 
									type="text" 
									value={editValues.jobTitle} 
									onchange={(e) => { editValues.jobTitle = e.currentTarget.value; }}
									class="flex-1"
								/>
								<Button 
									size="icon" 
									variant="default" 
									onclick={() => saveField('jobTitle')}
									disabled={isSaving}
								>
									{#if isSaving}
										<Loader2 class="h-4 w-4 animate-spin" />
									{:else}
										<Check class="h-4 w-4" />
									{/if}
								</Button>
								<Button 
									size="icon" 
									variant="outline" 
									onclick={() => cancelEditing('jobTitle')}
								>
									<X class="h-4 w-4" />
								</Button>
							</div>
						{:else}
							<div class="flex items-center gap-2">
								<p class={requirements.requirements.jobTitle ? 'text-gray-900' : 'text-gray-500'}>
									{requirements.requirements.jobTitle || $t('dashboard.chatWindow.notSpecified')}
								</p>
								<button 
									class="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
									onclick={() => startEditing('jobTitle')}
								>
									<Pen class="h-3.5 w-3.5 text-gray-400 hover:text-primary" />
								</button>
							</div>
						{/if}
					</div>

					<div 
						class="grid w-full grid-cols-[150px_1fr] items-start transition-colors duration-200 hover:bg-gray-50 rounded p-1 pl-0 group"
					>
						<h4 class="font-semibold">{$t('dashboard.chatWindow.jobDescription')}</h4>
						
						{#if editableFields.jobDescription}
							<div class="flex flex-col gap-2 w-full">
								<textarea 
									value={editValues.jobDescription} 
									onchange={(e) => { editValues.jobDescription = e.currentTarget.value; }}
									class="w-full rounded-md border p-2 text-sm min-h-[100px]"
								></textarea>
								<div class="flex justify-end gap-2">
									<Button 
										size="sm" 
										variant="default" 
										onclick={() => saveField('jobDescription')}
										disabled={isSaving}
									>
										{#if isSaving}
											<Loader2 class="h-4 w-4 animate-spin mr-2" />
											{$t('common.saving')}
										{:else}
											<Check class="h-4 w-4 mr-2" />
											{$t('common.save')}
										{/if}
									</Button>
									<Button 
										size="sm" 
										variant="outline" 
										onclick={() => cancelEditing('jobDescription')}
									>
										<X class="h-4 w-4 mr-2" />
										{$t('common.cancel')}
									</Button>
								</div>
							</div>
						{:else}
							<div class="flex items-start gap-2">
								<p class={requirements.requirements.jobDescription ? 'text-gray-900' : 'text-gray-500'}>
									{requirements.requirements.jobDescription || $t('dashboard.chatWindow.notSpecified')}
								</p>
								<button 
									class="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-0.5"
									onclick={() => startEditing('jobDescription')}
								>
									<Pen class="h-3.5 w-3.5 text-gray-400 hover:text-primary" />
								</button>
							</div>
						{/if}
					</div>

					<!-- Existing professions field (non-editable) -->
					<div class="grid w-full grid-cols-[150px_1fr] items-start">
						<h4 class="font-semibold">{$t('dashboard.chatWindow.professions')}</h4>
						<div class="flex flex-row flex-wrap gap-2">
							{#each requirements.requirements.professions || [] as profession}
								<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{profession}</span
								>
							{/each}
						</div>
					</div>
				</div>

				<div class="grid grid-cols-1 gap-4 text-sm">
					<!-- Existing specialization (non-editable) -->
					<div class="grid w-full grid-cols-[150px_1fr] items-start">
						<h4 class="font-semibold">{$t('dashboard.chatWindow.specialization')}</h4>
						<p class={requirements.requirements.specialization ? 'text-gray-900' : 'text-gray-500'}>
							{requirements.requirements.specialization || $t('dashboard.chatWindow.notSpecified')}
						</p>
					</div>

					<div 
						class="grid w-full grid-cols-[150px_1fr] items-start transition-colors duration-200 hover:bg-gray-50 rounded p-1 pl-0 group"
					>
						<h4 class="font-semibold">{$t('dashboard.chatWindow.workExperience')}</h4>
						
						{#if editableFields.jobRequiredWorkExperience}
							<div class="flex gap-2 w-full">
								<Input 
									type="number" 
									value={editValues.jobRequiredWorkExperience} 
									onchange={(e) => { editValues.jobRequiredWorkExperience = parseInt(e.currentTarget.value) || 0; }}
									class="flex-1"
									min="0"
								/>
								<Button 
									size="icon" 
									variant="default" 
									onclick={() => saveField('jobRequiredWorkExperience')}
									disabled={isSaving}
								>
									{#if isSaving}
										<Loader2 class="h-4 w-4 animate-spin" />
									{:else}
										<Check class="h-4 w-4" />
									{/if}
								</Button>
								<Button 
									size="icon" 
									variant="outline" 
									onclick={() => cancelEditing('jobRequiredWorkExperience')}
								>
									<X class="h-4 w-4" />
								</Button>
							</div>
						{:else}
							<div class="flex items-center gap-2">
								<p class={requirements.requirements.jobRequiredWorkExperience ? 'text-gray-900' : 'text-gray-500'}>
									{requirements.requirements.jobRequiredWorkExperience || 0}
									{$t('dashboard.chatWindow.years')}
								</p>
								<button 
									class="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
									onclick={() => startEditing('jobRequiredWorkExperience')}
								>
									<Pen class="h-3.5 w-3.5 text-gray-400 hover:text-primary" />
								</button>
							</div>
						{/if}
					</div>

					<div class="grid w-full grid-cols-[150px_1fr] items-start transition-colors duration-200 hover:bg-gray-50 rounded p-1 pl-0 group">
						<h4 class="font-semibold">{$t('dashboard.chatWindow.location')}</h4>
						
						{#if editableFields.country || editableFields.city || editableFields.stateProvinceRegion}
							<div class="flex flex-col gap-2 w-full">
								<div class="grid grid-cols-1 md:grid-cols-3 gap-2">
									<DropdownComponent
											options={availableCountries}
											value={editValues.country}
											justString={true}
											onValueChange={(value) => {
												editValues.country = value;
											}}
											placeholder="Country"
											optionKey="code"
											labelKey="name"
										/>
									<Input 
										type="text" 
										placeholder="City"
										value={editValues.city} 
										onchange={(e) => { editValues.city = e.currentTarget.value; }}
									/>
									<Input 
										type="text" 
										placeholder="Region/State/Province"
										value={editValues.stateProvinceRegion} 
										onchange={(e) => { editValues.stateProvinceRegion = e.currentTarget.value; }}
									/>
								</div>
								<div class="flex justify-end gap-2">
									<Button 
										size="sm" 
										variant="default" 
										onclick={() => saveField('country')}
										disabled={isSaving}
									>
										{#if isSaving}
											<Loader2 class="h-4 w-4 animate-spin mr-2" />
											{$t('common.saving')}
										{:else}
											<Check class="h-4 w-4 mr-2" />
											{$t('common.save')}
										{/if}
									</Button>
									<Button 
										size="sm" 
										variant="outline" 
										onclick={() => {
											cancelEditing('country');
											cancelEditing('city');
											cancelEditing('stateProvinceRegion');
										}}
									>
										<X class="h-4 w-4 mr-2" />
										{$t('common.cancel')}
									</Button>
								</div>
							</div>
						{:else}
							<div class="flex items-center gap-2">
								<p class={requirements.requirements.address?.city || requirements.requirements.address?.stateProvinceRegion ? 'text-gray-900' : 'text-gray-500'}>
									{requirements.requirements.country},
									{requirements.requirements.address?.city || ''}
									{requirements.requirements.address?.stateProvinceRegion
										? Array.isArray(requirements.requirements.address.stateProvinceRegion)
											? requirements.requirements.address.stateProvinceRegion.join(', ')
											: requirements.requirements.address.stateProvinceRegion
										: ''}
								</p>
								<button 
									class="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
									onclick={() => {
										startEditing('country');
										startEditing('city');
										startEditing('stateProvinceRegion');
									}}
								>
									<Pen class="h-3.5 w-3.5 text-gray-400 hover:text-primary" />
								</button>
							</div>
						{/if}
					</div>

					<div class="grid w-full grid-cols-[150px_1fr] items-start">
						<h4 class="font-semibold">{$t('dashboard.chatWindow.workTime')}</h4>
						<p class={requirements.requirements.workTimeType ? 'text-gray-900' : 'text-gray-500'}>
							{requirements.requirements.workTimeType?.join(', ') ||
								$t('dashboard.chatWindow.notSpecified')}
						</p>
					</div>

					<div class="grid w-full grid-cols-[150px_1fr] items-start">
						<h4 class="font-semibold text-gray-900">{$t('dashboard.chatWindow.languages')}</h4>
						<div class="flex flex-wrap gap-1">
							{#each requirements.requirements.jobRequiredLanguages || [] as language}
								<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{language}</span
								>
							{/each}
						</div>
					</div>

					<div class="grid w-full grid-cols-[150px_1fr] items-start transition-colors duration-200 hover:bg-gray-50 rounded p-1 pl-0 group">
						<h4 class="font-semibold">{$t('dashboard.chatWindow.salary')}</h4>
						
						{#if editableFields.salaryStart || editableFields.salaryEnd || editableFields.salaryCurrency}
							<div class="flex flex-col gap-2 w-full">
								<div class="grid grid-cols-1 md:grid-cols-3 gap-2">
									<Input 
										type="number" 
										placeholder="From"
										value={editValues.salaryStart} 
										onchange={(e) => { editValues.salaryStart = parseInt(e.currentTarget.value) || 0; }}
										min="0"
									/>
									<Input 
										type="number" 
										placeholder="To"
										value={editValues.salaryEnd} 
										onchange={(e) => { editValues.salaryEnd = parseInt(e.currentTarget.value) || 0; }}
										min="0"
									/>

									<DropdownComponent
											options={availableCurrencies}
											value={editValues.salaryCurrency}
											showLabelInBrackets={true}
											onValueChange={(value) => {
												editValues.salaryCurrency = value;
											}}
											placeholder="Currency"
											optionKey="code"
											labelKey="name"
										/>
									
								</div>
								<div class="flex justify-end gap-2">
									<Button 
										size="sm" 
										variant="default" 
										onclick={() => saveField('salaryStart')}
										disabled={isSaving}
									>
										{#if isSaving}
											<Loader2 class="h-4 w-4 animate-spin mr-2" />
											{$t('common.saving')}
										{:else}
											<Check class="h-4 w-4 mr-2" />
											{$t('common.save')}
										{/if}
									</Button>
									<Button 
										size="sm" 
										variant="outline" 
										onclick={() => {
											cancelEditing('salaryStart');
											cancelEditing('salaryEnd');
											cancelEditing('salaryCurrency');
										}}
									>
										<X class="h-4 w-4 mr-2" />
										{$t('common.cancel')}
									</Button>
								</div>
							</div>
						{:else}
							<div class="flex items-center gap-2">
								<p class={requirements.requirements.salary?.amountStart || requirements.requirements.salary?.amountEnd ? 'text-gray-900' : 'text-gray-500'}>
									{#if requirements.requirements.salary?.amountStart && requirements.requirements.salary?.amountEnd}
										{requirements.requirements.salary.amountStart} - {requirements.requirements.salary.amountEnd}
										{requirements.requirements.salary.currency || ''} ({requirements.requirements.salary.type || ''})
									{:else}
										{requirements.requirements.salary?.amountText || $t('dashboard.chatWindow.notSpecified')}
									{/if}
								</p>
								<button 
									class="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
									onclick={() => {
										startEditing('salaryStart');
										startEditing('salaryEnd');
										startEditing('salaryCurrency');
									}}
								>
									<Pen class="h-3.5 w-3.5 text-gray-400 hover:text-primary" />
								</button>
							</div>
						{/if}
					</div>
				</div>

				<div class="mt-4 border-t pt-3">
					<h4 class="mb-4 text-xl font-medium">
						{$t('dashboard.chatWindow.requiredQualifications')}
					</h4>
					
					<div class="transition-colors duration-200 hover:bg-gray-50 rounded p-1 group">
						{#if editableFields.jobRequiredQualifications}
							<div class="flex flex-col gap-2 w-full">
								<textarea 
									value={editValues.jobRequiredQualifications} 
									onchange={(e) => { editValues.jobRequiredQualifications = e.currentTarget.value; }}
									class="w-full rounded-md border p-2 text-sm min-h-[100px]"
								></textarea>
								<div class="flex justify-end gap-2">
									<Button 
										size="sm" 
										variant="default" 
										onclick={() => saveField('jobRequiredQualifications')}
										disabled={isSaving}
									>
										{#if isSaving}
											<Loader2 class="h-4 w-4 animate-spin mr-2" />
											{$t('common.saving')}
										{:else}
											<Check class="h-4 w-4 mr-2" />
											{$t('common.save')}
										{/if}
									</Button>
									<Button 
										size="sm" 
										variant="outline" 
										onclick={() => cancelEditing('jobRequiredQualifications')}
									>
										<X class="h-4 w-4 mr-2" />
										{$t('common.cancel')}
									</Button>
								</div>
							</div>
						{:else}
							<div class="flex items-start gap-2">
								<p class="{requirements.requirements.jobRequiredQualifications ? 'text-gray-900' : 'text-gray-500'} text-sm">
									{requirements.requirements.jobRequiredQualifications || $t('dashboard.chatWindow.notSpecified')}
								</p>
								<button 
									class="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-0.5"
									onclick={() => startEditing('jobRequiredQualifications')}
								>
									<Pen class="h-3.5 w-3.5 text-gray-400 hover:text-primary" />
								</button>
							</div>
						{/if}
					</div>
				</div>

				<div class="border-t pt-3">
					<h4 class="mb-4 text-xl font-medium">
						{$t('dashboard.chatWindow.additionalRequirements')}
					</h4>
					<div class="mt-1 grid grid-cols-1 gap-2 text-sm">
						<div class="grid w-full grid-cols-[150px_1fr] items-start">
							<h4 class="font-semibold">{$t('dashboard.chatWindow.drivingLicense')}</h4>
							<p
								class={requirements.requirements.extras?.drivingLicenceRequired
									? 'text-gray-900'
									: 'text-gray-500'}
							>
								{requirements.requirements.extras?.drivingLicenceRequired
									? $t('dashboard.chatWindow.required')
									: $t('dashboard.chatWindow.notRequired')}
							</p>
						</div>

						<div class="grid w-full grid-cols-[150px_1fr] items-start">
							<h4 class="font-semibold">{$t('dashboard.chatWindow.personalCar')}</h4>
							<p
								class={requirements.requirements.extras?.personalCarRequired
									? 'text-gray-900'
									: 'text-gray-500'}
							>
								{requirements.requirements.extras?.personalCarRequired
									? $t('dashboard.chatWindow.required')
									: $t('dashboard.chatWindow.notRequired')}
							</p>
						</div>

						{#if requirements.requirements.extras?.accommodationCompensationType}
							<div class="grid w-full grid-cols-[150px_1fr] items-start">
								<h4 class="font-semibold">{$t('dashboard.chatWindow.accommodation')}</h4>
								<p
									class={requirements.requirements.extras?.accommodationCompensationType
										? 'text-gray-900'
										: 'text-gray-500'}
								>
									{requirements.requirements.extras?.accommodationCompensationType}
								</p>
							</div>
						{/if}

						{#if requirements.requirements.extras?.transportCompensationType}
							<div class="grid w-full grid-cols-[150px_1fr] items-start">
								<h4 class="font-semibold">{$t('dashboard.chatWindow.transport')}</h4>
								<p
									class={requirements.requirements.extras?.transportCompensationType
										? 'text-gray-900'
										: 'text-gray-500'}
								>
									{requirements.requirements.extras?.transportCompensationType}
								</p>
							</div>
						{/if}

						{#if requirements.huntInstructions?.onlyCountriesToSearch?.length}
							<div class="flex flex-wrap gap-1">
								{#each requirements.huntInstructions.onlyCountriesToSearch as country}
									<span class="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
										>{country}</span
									>
								{/each}
							</div>
						{:else if requirements.huntInstructions?.preferredCountriesToSearch?.length}
							<div>
								<div class="mb-1 flex flex-wrap gap-1">
									{#each requirements.huntInstructions.preferredCountriesToSearch as country}
										<span class="rounded bg-green-50 px-2 py-0.5 text-xs text-green-700"
											>{country}</span
										>
									{/each}
								</div>
								<span class="text-xs text-gray-500"
									>{$t('dashboard.chatWindow.globalSearch')}</span
								>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{:else}
			<p class="text-sm text-gray-500">{$t('dashboard.chatWindow.notSpecified')}</p>
		{/if}
	</div>
</div>
