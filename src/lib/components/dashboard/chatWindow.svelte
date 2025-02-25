<script lang="ts">
	import type { Requirements } from "@/scrubinClient";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { scrubinClient } from "@/scrubinClient/client";
	import { onMount } from "svelte";
	import { toast } from "svelte-sonner";
	import { Loader2 } from "lucide-svelte";
	import { goto } from "$app/navigation";

	let {
		requirements = $bindable<Requirements>()
	}: {
		requirements: Requirements;
	} = $props();

	let currentQuestionIndex = $state(0);
	let answers: Record<string, string> = $state({});
	let currentAnswer = $state("");
	let isSubmitting = $state(false);
	let isComplete = $state(false);
	let isAnalyzing = $state(false);
	let isActivating = $state(false);
	let isEditingPrevious = $state(false);

	$effect(() => {
		// Reset answers when requirements change
		if (requirements) {
			answers = {};
			currentQuestionIndex = 0;
			isComplete = false;
			isAnalyzing = false;
			isEditingPrevious = false;
		}
	});

	function handleNextQuestion() {
		if (!requirements.followUpQuestions) {
			toast.error("No follow-up questions available.");
			return;
		}
		if (currentAnswer.trim()) {
			// Save the current answer
			const currentQuestion = requirements.followUpQuestions[currentQuestionIndex];
			answers[currentQuestion] = currentAnswer;
			currentAnswer = "";

			// Move to next question or complete
			if (currentQuestionIndex < requirements.followUpQuestions.length - 1) {
				currentQuestionIndex++;
				// Pre-fill with existing answer if available
				const nextQuestion = requirements.followUpQuestions[currentQuestionIndex];
				currentAnswer = answers[nextQuestion] || "";
			} else {
				submitAnswers();
			}
		}
	}

	function handlePreviousQuestion() {
		if (currentQuestionIndex > 0) {
			// Save current answer before moving back
			if (currentAnswer.trim()) {
				const currentQuestion = requirements.followUpQuestions[currentQuestionIndex];
				answers[currentQuestion] = currentAnswer;
			}
			
			// Move to previous question
			currentQuestionIndex--;
			
			// Load the previous answer
			const prevQuestion = requirements.followUpQuestions[currentQuestionIndex];
			currentAnswer = answers[prevQuestion] || "";
			isEditingPrevious = true;
		}
	}

	function goToQuestion(index: number) {
		if (index >= 0 && index < requirements.followUpQuestions.length) {
			// Save current answer before moving
			if (currentAnswer.trim()) {
				const currentQuestion = requirements.followUpQuestions[currentQuestionIndex];
				answers[currentQuestion] = currentAnswer;
			}
			
			// Move to selected question
			currentQuestionIndex = index;
			
			// Load the answer for that question
			const question = requirements.followUpQuestions[index];
			currentAnswer = answers[question] || "";
			isEditingPrevious = true;
		}
	}

	async function submitAnswers() {
		isSubmitting = true;
		if (!requirements.followUpQuestions) {
			toast.error("No follow-up questions available.");
			return;
		}
		
		try {
			// Format answers as required
			const formattedAnswers = requirements.followUpQuestions
				.map(question => `${question}\nanswer: ${answers[question] || ""}`)
				.join("\n");
			
			// Submit to API
			isAnalyzing = true;
			const response = await scrubinClient.hunt.updateRequirements(requirements.requirements.id, formattedAnswers);
			
			// Update requirements with the response
			requirements = response;
			isComplete = true;
		} catch (error) {
			console.error("Failed to submit answers:", error);
			toast.error("Failed to submit answers. Please try again.");
		} finally {
			isSubmitting = false;
			isAnalyzing = false;
		}
	}
	
	async function activateRequirements() {
		if (!requirements.requirements?.id) {
			toast.error("No requirements ID available.");
			return;
		}
		
		isActivating = true;
		try {
			const response = await scrubinClient.hunt.activateRequirements(requirements.requirements.id);
            goto("/dashboard/hunts/" + response.huntId);
			toast.success("Requirements activated successfully!");
		} catch (error) {
			console.error("Failed to activate requirements:", error);
			toast.error("Failed to activate requirements. Please try again.");
		} finally {
			isActivating = false;
		}
	}
</script>

<div class="flex flex-col gap-4 items-center w-full p-4 border rounded-lg shadow-sm">
	<div class="w-full">
		<h2 class="text-xl font-semibold mb-4">Follow-up Questions</h2>
		
		{#if isAnalyzing}
			<div class="p-4 bg-blue-50 text-blue-700 rounded-md">
				<p class="flex items-center gap-2">
					<Loader2 class="animate-spin w-4 h-4" />
					Analyzing your answers... This may take a moment.
				</p>
			</div>
		{:else if requirements.requirements?.canBeActivated}
			<div class="p-4 border rounded-md mb-4 bg-white">
				<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
					<div>
						<p class="font-medium">Your job requirements are ready to be activated!</p>
						{#if requirements.followUpQuestions && requirements.followUpQuestions.length > 0 && !isComplete}
							<p class="text-sm text-amber-700 mt-1">
								For better results, answer the follow-up questions below before activating.
							</p>
						{/if}
					</div>
					
					<Button 
						onclick={activateRequirements}
						disabled={isActivating}
						variant={!isComplete ? "outline" : "default"}
						class="whitespace-nowrap"
					>
						{#if isActivating}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							Activating...
						{:else}
							{!isComplete ? 'Activate Now' : 'Activate Requirements'}
						{/if}
					</Button>
				</div>
			</div>
		{/if}
		
		{#if !isAnalyzing}
			{#if isComplete && requirements.followUpQuestions && requirements.followUpQuestions.length > 0}
				<div class="p-4 bg-yellow-50 text-yellow-700 rounded-md mb-4">
					<p>We have additional follow-up questions based on your answers.</p>
				</div>
				<div class="space-y-4 w-full">
					<!-- Question navigation -->
					<div class="flex flex-wrap gap-2 mb-2">
						{#each requirements.followUpQuestions as _, i}
							<Button 
								variant={i === currentQuestionIndex ? "default" : "outline"}
								size="sm"
								onclick={() => goToQuestion(i)}
								class="min-w-8"
							>
								{i + 1}
							</Button>
						{/each}
					</div>
					
					<!-- Question display -->
					<div class="p-4 bg-gray-50 rounded-md">
						<p class="font-medium">
							Question {currentQuestionIndex + 1} of {requirements.followUpQuestions.length}:
						</p>
						<p class="mt-2">{requirements.followUpQuestions[currentQuestionIndex]}</p>
					</div>
					
					<!-- Answer input -->
					<div class="flex flex-col gap-2">
						<Input
							type="text"
							placeholder="Type your answer here..."
							bind:value={currentAnswer}
							onkeydown={(e) => e.key === 'Enter' && handleNextQuestion()}
						/>
						
						<div class="flex justify-between">
							<Button 
								onclick={handlePreviousQuestion}
								disabled={currentQuestionIndex === 0}
								variant="outline"
							>
								Previous
							</Button>
							
							<Button 
								onclick={handleNextQuestion}
								disabled={!currentAnswer.trim() || isSubmitting}
								variant="default"
							>
								{isEditingPrevious ? 'Save & Continue' : 
								  currentQuestionIndex < requirements.followUpQuestions.length - 1 ? 'Next Question' : 'Submit Answers'}
							</Button>
						</div>
					</div>
					
					<!-- Progress indicator -->
					<div class="w-full bg-gray-200 rounded-full h-2.5">
						<div 
							class="bg-primary h-2.5 rounded-full" 
							style="width: {((currentQuestionIndex + 1) / requirements.followUpQuestions.length) * 100}%"
						></div>
					</div>
				</div>
			{:else if isComplete}
				<div class="p-4 bg-green-50 text-green-700 rounded-md">
					<p>Thank you! Your answers have been processed successfully.</p>
				</div>
			{:else if requirements.followUpQuestions && requirements.followUpQuestions.length > 0}
				<div class="space-y-4 w-full">
					<!-- Question navigation -->
					<div class="flex flex-wrap gap-2 mb-2">
						{#each requirements.followUpQuestions as _, i}
							<Button 
								variant={i === currentQuestionIndex ? "default" : answers[requirements.followUpQuestions[i]] ? "outline" : "ghost"}
								size="sm"
								onclick={() => goToQuestion(i)}
								class="min-w-8"
							>
								{i + 1}
							</Button>
						{/each}
					</div>
					
					<!-- Question display -->
					<div class="p-4 bg-gray-50 rounded-md">
						<p class="font-medium">
							Question {currentQuestionIndex + 1} of {requirements.followUpQuestions.length}:
						</p>
						<p class="mt-2">{requirements.followUpQuestions[currentQuestionIndex]}</p>
					</div>
					
					<!-- Answer input -->
					<div class="flex flex-col gap-2">
						<Input
							type="text"
							placeholder="Type your answer here..."
							bind:value={currentAnswer}
							onkeydown={(e) => e.key === 'Enter' && handleNextQuestion()}
						/>
						
						<div class="flex justify-between">
							<Button 
								onclick={handlePreviousQuestion}
								disabled={currentQuestionIndex === 0}
								variant="outline"
							>
								Previous
							</Button>
							
							<Button 
								onclick={handleNextQuestion}
								disabled={!currentAnswer.trim() || isSubmitting}
								variant="default"
							>
								{isEditingPrevious ? 'Save & Continue' : 
								  currentQuestionIndex < requirements.followUpQuestions.length - 1 ? 'Next Question' : 'Submit Answers'}
							</Button>
						</div>
					</div>
					
					<!-- Progress indicator -->
					<div class="w-full bg-gray-200 rounded-full h-2.5">
						<div 
							class="bg-primary h-2.5 rounded-full" 
							style="width: {((currentQuestionIndex + 1) / requirements.followUpQuestions.length) * 100}%"
						></div>
					</div>
				</div>
			{:else}
				<p>No follow-up questions available.</p>
			{/if}
		{/if}
		
		<!-- Answer summary (visible when submitting) -->
		{#if isSubmitting && !isAnalyzing && requirements?.followUpQuestions}
			<div class="mt-4 p-4 bg-gray-50 rounded-md">
				<h3 class="font-medium mb-2">Your Answers:</h3>
				<div class="space-y-2">
					{#each requirements?.followUpQuestions as question, i}
						<div>
							<p class="font-medium">{question}</p>
							<p class="ml-4">answer: {answers[question] || ""}</p>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>