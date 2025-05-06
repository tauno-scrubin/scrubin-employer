<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import type { CompanyPlanSummary, PlanType, RequirementsWithInstructions } from '@/scrubinClient';
	import { scrubinClient } from '@/scrubinClient/client';
	import { t } from '$lib/i18n';
	import { AlertCircle, Check, ChevronDown, ChevronLeft, Loader2, Sparkle } from 'lucide-svelte';
	import { onMount, tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import PaymentDialog from '../payment/paymentDialog.svelte';
	import ChatWindowDemand from './chatWindowDemand.svelte';
	import { visible } from './overlay';

	let {
		requirements = $bindable<RequirementsWithInstructions>()
	}: {
		requirements: RequirementsWithInstructions;
	} = $props();

	let companyActivePlans = $state<CompanyPlanSummary[]>([]);
	onMount(async () => {
		companyActivePlans = await scrubinClient.company.getActivePlans();
		console.log(companyActivePlans);
		console.log(requirements);
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

			console.log(response);

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

			{$t('chatWindow.followUpQuestions')}
		</h2>

		{#if isAnalyzing}
			<div class="flex items-center justify-center rounded-lg bg-blue-50/70 p-4">
				<div class="flex flex-col items-center gap-2">
					<Loader2 class="h-6 w-6 animate-spin text-primary" />
					<p class="text-sm font-medium text-primary/80">{$t('chatWindow.analyzing')}</p>
				</div>
			</div>
		{:else if requirements?.canBeActivated}
			<div class="mb-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
				<div class="flex flex-col gap-3">
					<p class="inline-flex items-center gap-2 text-sm font-medium text-primary/90">
						<Sparkle fill="currentColor" strokeWidth="1" class="h-4 w-4 rotate-45 text-blue-500" />
						{isComplete ? $t('chatWindow.readyToActivate') : $t('chatWindow.completeQuestions')}
					</p>

					{#if requirements.allowedPlanOptions && requirements.allowedPlanOptions.length > 0}
						<div class="mt-2">
							<h3 class="mb-2 text-sm font-medium">{$t('chatWindow.selectSearchType')}</h3>
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
									<p>{$t('chatWindow.activationNeeded')}</p>
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
							{$t('chatWindow.confirming')}
						{:else}
							{$t('chatWindow.confirm')}
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
										value={answers[question.title] || ''}
										class="transition-all duration-200 focus:ring-primary/30"
										oninput={(e) => {
											const value = e.currentTarget.value;
											handleAnswerInput(i, value);
										}}
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
							{$t('chatWindow.additionalInstructions')}
						</p>
						<p class="mb-3 text-sm text-gray-500">{$t('chatWindow.addCustomRequirements')}</p>
						<div class="flex flex-col gap-3">
							<textarea
								placeholder={$t('chatWindow.additionalInstructionsPlaceholder')}
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
							{$t('chatWindow.submitting')}
						{:else}
							<Check class="h-4 w-4" />
							{$t('chatWindow.submit')}
						{/if}
					</Button>
				</div>
			</div>
		{:else if !requirements?.followUpQuestionsV2?.length && !requirements?.followUpQuestions?.length}
			<div class="mt-6 overflow-hidden rounded-lg border shadow-sm transition-all duration-200">
				<div class="bg-white p-3">
					<p class="mb-3 text-sm font-medium text-gray-700">
						{$t('chatWindow.additionalInstructions')}
					</p>
					<p class="mb-3 text-sm text-gray-500">{$t('chatWindow.addCustomRequirements')}</p>
					<div class="flex flex-col gap-3">
						<textarea
							placeholder={$t('chatWindow.additionalInstructionsPlaceholder')}
							bind:value={customInstructions}
							class="min-h-[100px] w-full rounded-md border p-3 text-sm transition-all duration-200 focus:border-primary/50 focus:ring-primary/30"
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
						{$t('chatWindow.submitting')}
					{:else}
						<Check class="h-4 w-4" />
						{$t('chatWindow.submit')}
					{/if}
				</Button>
			</div>
		{/if}
	</div>

	<!-- Right side: Job Requirements -->
	<div class="rounded-md bg-white p-4 md:w-2/3">
		<Sparkle fill="currentColor" strokeWidth="1" class="mb-4 h-8 w-8 rotate-45 text-blue-500" />
		<h2 class="mb-4 text-xl font-medium">{$t('chatWindow.jobRequirements')}</h2>

		{#if requirements.requirements}
			<div class="space-y-3">
				<div class="grid grid-cols-1 gap-4 border-b pb-3 text-sm">
					<div class="grid w-full grid-cols-[150px_1fr] items-start">
						<h4 class="font-semibold">{$t('chatWindow.jobTitle')}</h4>
						<p class={requirements.requirements.jobTitle ? 'text-gray-900' : 'text-gray-500'}>
							{requirements.requirements.jobTitle || $t('chatWindow.notSpecified')}
						</p>
					</div>

					<div class="grid w-full grid-cols-[150px_1fr] items-start">
						<h4 class="font-semibold">{$t('chatWindow.jobDescription')}</h4>
						<p class={requirements.requirements.jobDescription ? 'text-gray-900' : 'text-gray-500'}>
							{requirements.requirements.jobDescription || $t('chatWindow.notSpecified')}
						</p>
					</div>

					<div class="grid w-full grid-cols-[150px_1fr] items-start">
						<h4 class="font-semibold">{$t('chatWindow.professions')}</h4>
						<div class="flex flex-row flex-wrap gap-2">
							{#each requirements.requirements.professions || [] as profession}
								<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
									>{profession}</span
								>
							{/each}
						</div>
					</div>
				</div>

				<div class="grid grid-cols-1 gap-4 text-sm">
					<div class="grid w-full grid-cols-[150px_1fr] items-start">
						<h4 class="font-semibold">{$t('chatWindow.specialization')}</h4>
						<p class={requirements.requirements.specialization ? 'text-gray-900' : 'text-gray-500'}>
							{requirements.requirements.specialization || $t('chatWindow.notSpecified')}
						</p>
					</div>

					<div class="grid w-full grid-cols-[150px_1fr] items-start">
						<h4 class="font-semibold">{$t('chatWindow.workExperience')}</h4>
						<p
							class={requirements.requirements.jobRequiredWorkExperience
								? 'text-gray-900'
								: 'text-gray-500'}
						>
							{requirements.requirements.jobRequiredWorkExperience || 0}
							{$t('chatWindow.years')}
						</p>
					</div>

					<div class="grid w-full grid-cols-[150px_1fr] items-start">
						<h4 class="font-semibold">{$t('chatWindow.location')}</h4>
						<p
							class={requirements.requirements.address?.city ||
							requirements.requirements.address?.stateProvinceRegion
								? 'text-gray-900'
								: 'text-gray-500'}
						>
							{requirements.requirements.country},
							{requirements.requirements.address?.city || ''}
							{requirements.requirements.address?.stateProvinceRegion
								? Array.isArray(requirements.requirements.address.stateProvinceRegion)
									? requirements.requirements.address.stateProvinceRegion.join(', ')
									: requirements.requirements.address.stateProvinceRegion
								: ''}
						</p>
					</div>

					<div class="grid w-full grid-cols-[150px_1fr] items-start">
						<h4 class="font-semibold">{$t('chatWindow.workTime')}</h4>
						<p class={requirements.requirements.workTimeType ? 'text-gray-900' : 'text-gray-500'}>
							{requirements.requirements.workTimeType?.join(', ') || $t('chatWindow.notSpecified')}
						</p>
					</div>

					<div class="grid w-full grid-cols-[150px_1fr] items-start">
						<h4 class="font-semibold text-gray-900">{$t('chatWindow.languages')}</h4>
						<div class="flex flex-wrap gap-1">
							{#each requirements.requirements.jobRequiredLanguages || [] as language}
								<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{language}</span
								>
							{/each}
						</div>
					</div>

					<div class="grid w-full grid-cols-[150px_1fr] items-start">
						<h4 class="font-semibold">{$t('chatWindow.salary')}</h4>
						<p
							class={requirements.requirements.salary?.amountStart ||
							requirements.requirements.salary?.amountEnd
								? 'text-gray-900'
								: 'text-gray-500'}
						>
							{#if requirements.requirements.salary?.amountStart && requirements.requirements.salary?.amountEnd}
								{requirements.requirements.salary.amountStart} - {requirements.requirements.salary
									.amountEnd}
								{requirements.requirements.salary.currency || ''} ({requirements.requirements.salary
									.type || ''})
							{:else}
								{requirements.requirements.salary?.amountText || $t('chatWindow.notSpecified')}
							{/if}
						</p>
					</div>
				</div>

				<div class="mt-4 border-t pt-3">
					<h4 class="mb-4 text-xl font-medium">{$t('chatWindow.requiredQualifications')}</h4>
					<p
						class="{requirements.requirements.jobRequiredQualifications
							? 'text-gray-900'
							: 'text-gray-500'} text-sm"
					>
						{requirements.requirements.jobRequiredQualifications || $t('chatWindow.notSpecified')}
					</p>
				</div>

				<div class="border-t pt-3">
					<h4 class="mb-4 text-xl font-medium">{$t('chatWindow.additionalRequirements')}</h4>
					<div class="mt-1 grid grid-cols-1 gap-2 text-sm">
						<div class="grid w-full grid-cols-[150px_1fr] items-start">
							<h4 class="font-semibold">{$t('chatWindow.drivingLicense')}</h4>
							<p
								class={requirements.requirements.extras?.drivingLicenceRequired
									? 'text-gray-900'
									: 'text-gray-500'}
							>
								{requirements.requirements.extras?.drivingLicenceRequired
									? $t('chatWindow.required')
									: $t('chatWindow.notRequired')}
							</p>
						</div>

						<div class="grid w-full grid-cols-[150px_1fr] items-start">
							<h4 class="font-semibold">{$t('chatWindow.personalCar')}</h4>
							<p
								class={requirements.requirements.extras?.personalCarRequired
									? 'text-gray-900'
									: 'text-gray-500'}
							>
								{requirements.requirements.extras?.personalCarRequired
									? $t('chatWindow.required')
									: $t('chatWindow.notRequired')}
							</p>
						</div>

						{#if requirements.requirements.extras?.accommodationCompensationType}
							<div class="grid w-full grid-cols-[150px_1fr] items-start">
								<h4 class="font-semibold">{$t('chatWindow.accommodation')}</h4>
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
								<h4 class="font-semibold">{$t('chatWindow.transport')}</h4>
								<p
									class={requirements.requirements.extras?.transportCompensationType
										? 'text-gray-900'
										: 'text-gray-500'}
								>
									{requirements.requirements.extras?.transportCompensationType}
								</p>
							</div>
						{/if}

						{#if requirements.huntInstructions?.onlyCountriesToSearch?.length || requirements.huntInstructions?.preferredCountriesToSearch?.length}
							<div class="grid w-full grid-cols-[150px_1fr] items-start">
								<h4 class="font-semibold">{$t('chatWindow.searchScope')}</h4>
								<div class="flex flex-col gap-1">
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
											<span class="text-xs text-gray-500">{$t('chatWindow.globalSearch')}</span>
										</div>
									{/if}
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{:else}
			<p class="text-sm text-gray-500">{$t('chatWindow.notSpecified')}</p>
		{/if}
	</div>
</div>
