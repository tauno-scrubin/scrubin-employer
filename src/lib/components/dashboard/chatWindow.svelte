<script lang="ts">
	import type { CompanyPlanSummary, PlanType, Requirements, RequirementsWithInstructions } from "@/scrubinClient";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { scrubinClient } from "@/scrubinClient/client";
	import { onMount, tick } from "svelte";
	import { toast } from "svelte-sonner";
	import { 
		Loader2, 
		ArrowRight, 
		ArrowLeft, 
		Check, 
		ChevronDown, 
		ChevronRight,
		Briefcase,
		MapPin,
		Clock,
		DollarSign,
		GraduationCap,
		Languages,
		Car,
		Building,
		MessageSquare,
		ListChecks,
		FileText,
		Plus,

		Sparkle,

		ChevronLeft,
		Badge


	} from "lucide-svelte";
	import { goto } from "$app/navigation";
	import { visible } from "./overlay";
	import PaymentDialog from "../payment/paymentDialog.svelte";
	import ChatWindowPricing from "./chatWindowPricing.svelte";
	import ChatWindowDemand from "./chatWindowDemand.svelte";
	import * as Tabs from "$lib/components/ui/tabs/index.js";
	import { AlertCircle } from "lucide-svelte";

	let {
		requirements = $bindable<RequirementsWithInstructions>()
	}: {
		requirements: RequirementsWithInstructions;
	} = $props();

	let companyActivePlans = $state<CompanyPlanSummary[]>([])
	onMount(async () => {
		companyActivePlans = await scrubinClient.company.getActivePlans()
		console.log(companyActivePlans)
		console.log(requirements)
	})

	let currentQuestionIndex = $state(0);
	let answers: Record<string, string> = $state({});
	let currentAnswer = $state("");
	let isSubmitting = $state(false);
	let isComplete = $state(false);
	let isAnalyzing = $state(false);
	let isActivating = $state(false);
	let isEditingPrevious = $state(false);
	let customInstructions = $state("");
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
			customInstructions = "";
		}
	});
	function handleNextQuestion() {
		if (!requirements.followUpQuestionsV2) {
			toast.error("No follow-up questions available.");
			return;
		}
		if (currentAnswer.trim()) {
			// Save the current answer
			const currentQuestion = requirements.followUpQuestionsV2[currentQuestionIndex];
			answers[currentQuestion.title] = currentAnswer;
			currentAnswer = "";

			// Move to next question or complete
			if (currentQuestionIndex < requirements.followUpQuestionsV2.length - 1) {
				currentQuestionIndex++;
				// Pre-fill with existing answer if available
				const nextQuestion = requirements.followUpQuestionsV2[currentQuestionIndex];
				currentAnswer = answers[nextQuestion.title] || "";
				// Open the next question in the accordion
				toggleQuestion(currentQuestionIndex-1);
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
				currentAnswer = answers[prevQuestion.title] || "";
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
			currentAnswer = answers[question.title] || "";
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
			toast.error("No follow-up questions or custom instructions available.");
			return;
		}
		
		try {
			// Format answers as required
			let formattedAnswers = "";
			
			if (requirements.followUpQuestionsV2) {
				formattedAnswers = requirements.followUpQuestionsV2
					.map(question => `${question.title}\nanswer: ${answers[question.title] || ""}`)
					.join("\n");
			}
			
			// Add custom instructions if provided
			if (customInstructions.trim()) {
				formattedAnswers += formattedAnswers ? "\n\n" : "";
				formattedAnswers += `Additional Instructions:\n${customInstructions.trim()}`;
			}
			
			// Submit to API
			isAnalyzing = true;
			const response = await scrubinClient.hunt.updateRequirements(requirements.requirements.id, formattedAnswers);
			// Update requirements with the response
			requirements = response;
            await tick()
            isComplete = true;
			
		} catch (error) {
			console.error("Failed to submit answers:", error);
			toast.error("Failed to submit answers. Please try again.");
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
		if (companyActivePlans && !companyActivePlans.some((plan: CompanyPlanSummary) => plan.planType === planType && plan.planActive)) {
			showPlanActivationMessage = true;
		} else {
			showPlanActivationMessage = false;
		}
	}

	function canBeActivated(activePlans: CompanyPlanSummary[], selectedPlan: PlanType | null, isActivatingNow: boolean): boolean {
		// Don't allow activation during ongoing process or without selection
		if (isActivatingNow || !selectedPlan) {
			return false;
		}
		
		// Check if this plan type is actually activated in company account
		if (!activePlans.some((plan: CompanyPlanSummary) => plan.planType === selectedPlan && plan.planActive)) {
			return false;
		}
		
		return true;
	}

	async function activateRequirements() {
		if (!requirements.requirements?.id) {
			toast.error("No requirements ID available.");
			return;
		}
		if (!selectedPlanType) {
			toast.error("No plan type selected.");
			return;
		}
		
		// Don't allow activation if plan isn't activated yet
		if (companyActivePlans && !companyActivePlans.some((plan: CompanyPlanSummary) => plan.planType === selectedPlanType && plan.planActive)) {
			toast.error("Please activate this plan type first in Pricing section.");
			return;
		}
		
		isActivating = true;
		
		try {
			const response = await scrubinClient.hunt.createHuntFromRequirements(
				requirements.requirements.id, 
				selectedPlanType
			);
			payableHuntId = response.huntId;

			console.log(response)
			
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
			console.error("Failed to activate requirements:", error);
			toast.error("Failed to activate requirements. Please try again.");
		} finally {
			isActivating = false;
		}
	}

	function onPaymentSuccess(huntId: number) {
		goto("/dashboard/hunts/" + huntId);
		toast.success("Requirements activated successfully!");
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

<PaymentDialog  bind:open={paymentDialogOpen} 
	huntId={payableHuntId} 
	amount={chargeableAmount.amount} 
	currency={chargeableAmount.currency} 
	vatPercentage={chargeableAmount.vatPercentage}
	vatAmount={chargeableAmount.vatAmount}
	onSuccess={onPaymentSuccess}></PaymentDialog>

<!-- 
  Container: use flex-row, narrower left column (md:w-1/3), 
  and a larger right column (md:w-2/3) with a left border for clarity.
-->
<div class="flex flex-col md:flex-row w-full bg-blue-50/80 rounded p-4 gap-4">
	<!-- Left side: Follow-up Questions -->
	<div class="md:w-1/3 p-4 bg-white rounded-md shadow-sm">
		<h2 class="text-lg font-medium mb-4 text-primary flex items-center gap-2">
            <Button variant="outline" size="icon" onclick={() => goBack()}>
                <ChevronLeft class="w-4 h-4" />
            </Button>
			
            Follow-up Questions</h2>
			
		{#if isAnalyzing}
			<div class="p-4 bg-blue-50/70 rounded-lg flex items-center justify-center">
				<div class="flex flex-col items-center gap-2">
					<Loader2 class="animate-spin w-6 h-6 text-primary" />
					<p class="text-sm font-medium text-primary/80">Analyzing your answers...</p>
				</div>
			</div>
		{:else if requirements?.canBeActivated}
			
			
			<div class="p-4 rounded-lg mb-4 bg-gradient-to-r from-blue-50 to-indigo-50">
				<div class="flex flex-col gap-3">
					<p class="font-medium inline-flex items-center gap-2 text-sm text-primary/90">
						<Sparkle fill="currentColor" strokeWidth=1 class="w-4 h-4 text-blue-500 rotate-45" />
						{isComplete ? 'Ready to activate' : 'Complete questions for better results'}
					</p>
					
					{#if requirements.allowedPlanOptions && requirements.allowedPlanOptions.length > 0}
						<div class="mt-2">
							<h3 class="text-sm font-medium mb-2">Select search type:</h3>
							<div 
								class="w-full" 
							>
								<div class="w-full space-y-2">
									{#each requirements.allowedPlanOptions as planType}
										<Button variant={selectedPlanType == planType ? 'default' : 'outline'} onclick={() => selectPlan(planType)} class="w-full capitalize relative">
											{planType.replace('_', ' ')}
							
										</Button>
									{/each}
								</div>
							</div>
							
							{#if showPlanActivationMessage && !canBeActivated(companyActivePlans || [], selectedPlanType, isActivating)}
								<div class="mt-2 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
									<AlertCircle class="h-4 w-4" />
									<p>This plan type needs to be activated first in your account settings.</p>
								</div>
							{/if}
						</div>
					{/if}
					
					<Button 
					onclick={activateRequirements}
					disabled={!canBeActivated(companyActivePlans || [], selectedPlanType, isActivating)}
					variant={!isComplete ? "outline" : "default"}
						size="sm"
						class="whitespace-nowrap transition-all duration-300 hover:scale-105 mt-2"
					>
						{#if isActivating}
							<Loader2 class="mr-2 h-3 w-3 animate-spin" />
							Confirming...
						{:else}
							Confirm
						{/if}
					</Button>
				</div>
			</div>
			<!-- <ChatWindowPricing hiringPlan={requirements.hiringPlan} /> -->
			<ChatWindowDemand hiringPlan={requirements.hiringPlan} />
		{/if}
		
		{#if !isAnalyzing && requirements.followUpQuestionsV2 && requirements.followUpQuestionsV2.length > 0}
			<div class="space-y-3 w-full">
				{#each requirements.followUpQuestionsV2 as question, i}
					<div class="overflow-hidden rounded-lg transition-all duration-200  border {expandedQuestions.has(i) ? 'shadow-sm' : 'border-gray-100'}">
						<!-- Collapsible question header -->
						<div 
							class="flex justify-between items-center p-3 
								cursor-pointer hover:bg-gray-50 transition-colors duration-200"
							onclick={() => toggleQuestion(i)}
						>
							<div class="flex items-center gap-3 min-w-0 flex-1 pr-2">
								<span class={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium
									${answers[question.title] ? 'bg-primary text-white' : 'bg-blue-50 text-gray-500'} 
									transition-all duration-300`}>
									{answers[question.title] ? '✓' : i + 1}
								</span>
								<span class="text-sm font-medium text-gray-700 truncate overflow-hidden">
									{question.title}
								</span>
							</div>
							<span class="text-gray-400 transition-transform duration-200 flex-shrink-0">
								<ChevronDown class="h-4 w-4 {expandedQuestions.has(i) ? 'rotate-180' : ''}" />
							</span>
						</div>
						
						<!-- Collapsible content -->
						{#if expandedQuestions.has(i)}
							<div class="p-3 border-t bg-white">
								<p class="mb-3 text-sm font-medium text-gray-700">{question.title}</p>
								<p class="mb-3 text-sm text-gray-500">{question.description}</p>
								<div class="flex flex-col gap-3">
									<Input
										type="text"
										placeholder="Type your answer here..."
										value={answers[question.title] || ""}
										class="focus:ring-primary/30 transition-all duration-200"
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
				<div class="overflow-hidden rounded-lg transition-all duration-200 border shadow-sm mt-6">
					<div class="p-3 bg-white">
						<p class="mb-3 text-sm font-medium text-gray-700">Additional Instructions</p>
						<p class="mb-3 text-sm text-gray-500">Add any custom requirements or clarifications that weren't covered by the questions above.</p>
						<div class="flex flex-col gap-3">
							<textarea
								placeholder="Type any additional instructions here..."
								value={customInstructions}
								class="w-full p-3 border rounded-md focus:ring-primary/30 focus:border-primary/50 text-sm transition-all duration-200 min-h-[100px]"
								onchange={(e) => {
									customInstructions = e.currentTarget.value;
								}}
							></textarea>
						</div>
					</div>
				</div>
				
				<!-- Single Submit button that's always present -->
				<div class="flex justify-end mt-6">
					<Button 
						onclick={submitAnswers}
						disabled={isSubmitting || (Object.keys(answers).length === 0 && !customInstructions.trim())}
						variant="default"
						size="default"
						class="transition-all duration-300 hover:scale-105 bg-gradient-to-r from-primary to-primary/90 px-4"
					>
						{#if isSubmitting}
							<Loader2 class="h-4 w-4 animate-spin" />
							Submitting...
						{:else}
							<Check class="h-4 w-4" />
							Submit
						{/if}
					</Button>
				</div>
			</div>
      
		{:else if !requirements?.followUpQuestionsV2?.length && !requirements?.followUpQuestions?.length}
			<div class="overflow-hidden rounded-lg transition-all duration-200 border shadow-sm mt-6">
				<div class="p-3 bg-white">
					<p class="mb-3 text-sm font-medium text-gray-700">Additional Instructions</p>
					<p class="mb-3 text-sm text-gray-500">Add any custom requirements or clarifications that weren't covered by the questions above.</p>
					<div class="flex flex-col gap-3">
						<textarea
							placeholder="Type any additional instructions here..."
							bind:value={customInstructions}
							class="w-full p-3 border rounded-md focus:ring-primary/30 text-sm focus:border-primary/50 transition-all duration-200 min-h-[100px]"
						></textarea>
					</div>
				</div>
			</div>
			
			<!-- Single Submit button for no-questions case -->
			<div class="flex justify-end mt-6">
				<Button 
					onclick={submitAnswers}
					disabled={isSubmitting || !customInstructions.trim()}
					variant="default"
					size="default"
					class="transition-all duration-300 hover:scale-105 bg-gradient-to-r from-primary to-primary/90 px-4"
				>
					{#if isSubmitting}
						<Loader2 class="h-4 w-4 animate-spin" />
						Submitting...
					{:else}
						<Check class="h-4 w-4" />
						Submit
					{/if}
				</Button>
			</div>
		{/if}
	</div>
	
	<!-- Right side: Job Requirements -->
	<div class="md:w-2/3 p-4 bg-white rounded-md">
        <Sparkle fill="currentColor" strokeWidth=1 class="w-8 h-8 text-blue-500 mb-4 rotate-45" />
		<h2 class="text-xl font-medium mb-4">Job Requirements</h2>
		
		{#if requirements.requirements}
			<div class="space-y-3">
				<div class="grid grid-cols-1 gap-4 text-sm border-b pb-3">
                    <div class="w-full grid grid-cols-[150px_1fr] items-start">
						<h4 class="font-semibold">Job title</h4>
						<p class="{requirements.requirements.jobTitle ? 'text-gray-900' : 'text-gray-500'}">{requirements.requirements.jobTitle || 'Not specified'}</p>
					</div>

                    <div class="w-full grid grid-cols-[150px_1fr] items-start">
						<h4 class="font-semibold">Job description</h4>
						<p class="{requirements.requirements.jobDescription ? 'text-gray-900' : 'text-gray-500'}">{requirements.requirements.jobDescription || 'Not specified'}</p>
					</div>

                    <div class="w-full grid grid-cols-[150px_1fr] items-start">
						<h4 class="font-semibold">Professions</h4>
                        <div class="flex flex-row gap-2 flex-wrap">
                            {#each requirements.requirements.professions || [] as profession}
                                <span class="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">{profession}</span>
                            {/each}
                        </div>
					</div>

				</div>
				
				<div class="grid grid-cols-1 gap-4 text-sm">
					<div class="w-full grid grid-cols-[150px_1fr] items-start">
						<h4 class="font-semibold">Specialization</h4>
						<p class="{requirements.requirements.specialization ? 'text-gray-900' : 'text-gray-500'}">{requirements.requirements.specialization || 'Not specified'}</p>
					</div>
					
					<div class="w-full grid grid-cols-[150px_1fr] items-start">
						<h4 class="font-semibold">Work Experience</h4>
						<p class="{requirements.requirements.jobRequiredWorkExperience ? 'text-gray-900' : 'text-gray-500'}">{requirements.requirements.jobRequiredWorkExperience || 0} years</p>
					</div>
					
					<div class="w-full grid grid-cols-[150px_1fr] items-start">
						<h4 class="font-semibold">Location</h4>
						<p class="{requirements.requirements.address?.city || requirements.requirements.address?.stateProvinceRegion ? 'text-gray-900' : 'text-gray-500'}">
							{requirements.requirements.country}, 
							{requirements.requirements.address?.city || ''} 
							{requirements.requirements.address?.stateProvinceRegion ? 
								(Array.isArray(requirements.requirements.address.stateProvinceRegion) ? 
									requirements.requirements.address.stateProvinceRegion.join(', ') : 
									requirements.requirements.address.stateProvinceRegion) : 
								''}
						</p>
					</div>
					
					<div class="w-full grid grid-cols-[150px_1fr] items-start">
						<h4 class="font-semibold">Work Time</h4>
						<p class="{requirements.requirements.workTimeType ? 'text-gray-900' : 'text-gray-500'}">{requirements.requirements.workTimeType?.join(', ') || 'Not specified'}</p>
					</div>
					
					<div class="w-full grid grid-cols-[150px_1fr] items-start">
						<h4 class="text-gray-900 font-semibold">Languages</h4>
						<div class="flex flex-wrap gap-1">
							{#each requirements.requirements.jobRequiredLanguages || [] as language}
								<span class="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">{language}</span>
							{/each}
						</div>
					</div>
					
					<div class="w-full grid grid-cols-[150px_1fr] items-start">
						<h4 class="font-semibold">Salary</h4>
						<p class="{requirements.requirements.salary?.amountStart || requirements.requirements.salary?.amountEnd ? 'text-gray-900' : 'text-gray-500'}">
							{#if requirements.requirements.salary?.amountStart && requirements.requirements.salary?.amountEnd}
								{requirements.requirements.salary.amountStart} - {requirements.requirements.salary.amountEnd} 
								{requirements.requirements.salary.currency || ''} ({requirements.requirements.salary.type || ''})
							{:else}
								{requirements.requirements.salary?.amountText || 'Not specified'}
							{/if}
						</p>
					</div>
				</div>
				
				<div class="border-t pt-3 mt-4">
					<h4 class="text-xl font-medium mb-4">Required Qualifications</h4>
					<p class="{requirements.requirements.jobRequiredQualifications ? 'text-gray-900' : 'text-gray-500'} text-sm">{requirements.requirements.jobRequiredQualifications || 'Not specified'}</p>
				</div>
				
				<div class="border-t pt-3">
					<h4 class="text-xl font-medium mb-4">Additional Requirements</h4>
					<div class="grid grid-cols-1 gap-2 mt-1 text-sm">


                        <div class="w-full grid grid-cols-[150px_1fr] items-start">
                            <h4 class="font-semibold">Driving License</h4>
                            <p class="{requirements.requirements.extras?.drivingLicenceRequired ? 'text-gray-900' : 'text-gray-500'}">{requirements.requirements.extras?.drivingLicenceRequired ? 'Required' : 'Not required'}</p>
                        </div>


                        <div class="w-full grid grid-cols-[150px_1fr] items-start">
                            <h4 class="font-semibold">Personal Car</h4>
                            <p class="{requirements.requirements.extras?.personalCarRequired ? 'text-gray-900' : 'text-gray-500'}">{requirements.requirements.extras?.personalCarRequired ? 'Required' : 'Not required'}</p>
                        </div>
                        
                        {#if requirements.requirements.extras?.accommodationCompensationType}
                        <div class="w-full grid grid-cols-[150px_1fr] items-start">
                            <h4 class="font-semibold">Accommodation</h4>
                            <p class="{requirements.requirements.extras?.accommodationCompensationType ? 'text-gray-900' : 'text-gray-500'}">{requirements.requirements.extras?.accommodationCompensationType}</p>
                        </div>
                        {/if}

                        {#if requirements.requirements.extras?.transportCompensationType}
                        <div class="w-full grid grid-cols-[150px_1fr] items-start">
                            <h4 class="font-semibold">Transport</h4>
                            <p class="{requirements.requirements.extras?.transportCompensationType ? 'text-gray-900' : 'text-gray-500'}">{requirements.requirements.extras?.transportCompensationType}</p>
                        </div>
                        {/if}

                        {#if requirements.huntInstructions?.onlyCountriesToSearch?.length || requirements.huntInstructions?.preferredCountriesToSearch?.length}
                        <div class="w-full grid grid-cols-[150px_1fr] items-start">
                            <h4 class="font-semibold">Search Scope</h4>
                            <div class="flex flex-col gap-1">
                                {#if requirements.huntInstructions?.onlyCountriesToSearch?.length}
                                    <div class="flex flex-wrap gap-1">
                                        {#each requirements.huntInstructions.onlyCountriesToSearch as country}
                                            <span class="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">{country}</span>
                                        {/each}
                                    </div>
                                {:else if requirements.huntInstructions?.preferredCountriesToSearch?.length}
                                    <div>
                                        <div class="flex flex-wrap gap-1 mb-1">
                                            {#each requirements.huntInstructions.preferredCountriesToSearch as country}
                                                <span class="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded">{country}</span>
                                            {/each}
                                        </div>
                                        <span class="text-xs text-gray-500">Global search with preference for listed countries</span>
                                    </div>
                                {/if}
                            </div>
                        </div>
                        {/if}

					</div>
				</div>
			</div>
		{:else}
			<p class="text-sm text-gray-500">No requirements data available.</p>
		{/if}
	</div>
</div>
