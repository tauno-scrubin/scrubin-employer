<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { scrubinClient } from '@/scrubinClient/client';
	import type { JobRequirementDto } from '@/scrubinClient';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { ArrowLeft, ArrowRight, Check } from 'lucide-svelte';
	import { visible } from '@/components/dashboard/overlay';
	import { t } from '$lib/i18n';

	// Step components
	import BasicInfoStep from '$lib/components/requirements/v2/BasicInfoStep.svelte';
	import LocationSalaryStep from '$lib/components/requirements/v2/LocationSalaryStep.svelte';
	import JobDetailsStep from '$lib/components/requirements/v2/JobDetailsStep.svelte';
	import TargetingStep from '$lib/components/requirements/v2/TargetingStep.svelte';
	import PreviewStep from '$lib/components/requirements/v2/PreviewStep.svelte';

	// Step configuration
	const steps = $derived([
		{ id: 'basic', title: $t('requirementsV2.steps.basic.title'), description: $t('requirementsV2.steps.basic.description') },
		{ id: 'location', title: $t('requirementsV2.steps.location.title'), description: $t('requirementsV2.steps.location.description') },
		{ id: 'details', title: $t('requirementsV2.steps.details.title'), description: $t('requirementsV2.steps.details.description') },
		{ id: 'targeting', title: $t('requirementsV2.steps.targeting.title'), description: $t('requirementsV2.steps.targeting.description') },
		{ id: 'preview', title: $t('requirementsV2.steps.preview.title'), description: $t('requirementsV2.steps.preview.description') }
	]);

	let currentStep = $state(0);
	let requirement: JobRequirementDto | null = $state(null);
	let requirementId: number | null = $state(null);
	let isSaving = $state(false);
	let isActivating = $state(false);

	onMount(async () => {
		visible.set(true);
		try {
			const idParam = page.params.id;

			if (idParam) {
				// Load existing requirement
				requirementId = parseInt(idParam);
				const session = await scrubinClient.hunt.getRequirementChatResult(requirementId);
				requirement = session.currentRequirements;
			} else {
				// Create new requirement
				const session = await scrubinClient.hunt.requirementsChat({
					message: 'I want to create a new job hunt'
				});

				requirementId = session.jobRequirementId;
				requirement = session.currentRequirements;

				// Update URL to include the ID
				goto(`/dashboard/hunts/requirements/${requirementId}/create`, { replaceState: true });
			}
		} catch (error) {
			console.error('Failed to initialize requirement:', error);
			toast.error($t('requirementsV2.errors.failedToInitialize'));
			goto('/dashboard/hunts');
		} finally {
			visible.set(false);
		}
	});

	// Step validation logic
	function isStepCompleted(stepIndex: number): boolean {
		if (!requirement) return false;

		switch (stepIndex) {
			case 0: // Basic Info
				return !!(
					requirement.jobTitle &&
					requirement.professionsV2 &&
					requirement.professionsV2.length > 0
				);
			case 1: // Location & Salary
				return !!(requirement.countryIso && requirement.salary?.amountStart);
			case 2: // Job Details
				return !!requirement.jobDescription;
			case 3: // Targeting
				return true; // Optional step
			case 4: // Preview
				return true; // Always accessible if other steps are done
			default:
				return false;
		}
	}

	// Check if step can be accessed (non-linear navigation)
	function canAccessStep(stepIndex: number): boolean {
		if (stepIndex === 0) return true; // First step always accessible
		if (stepIndex <= currentStep) return true; // Already visited steps

		// Can access if current step is completed
		return isStepCompleted(currentStep);
	}

	async function saveAndNext() {
		if (!requirementId) return;
		currentStep = Math.min(currentStep + 1, steps.length - 1);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function goBack() {
		currentStep = Math.max(currentStep - 1, 0);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function goToStep(stepIndex: number) {
		if (!canAccessStep(stepIndex)) {
			toast.error($t('requirementsV2.errors.completeCurrentStep'));
			return;
		}
		currentStep = stepIndex;
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	async function handleActivate() {
		if (!requirementId) return;

		isActivating = true;
		try {
			const activePlan = await scrubinClient.company.getActivePlans();
			const plan = activePlan.find((p) => p.planActive);

			if (!plan) {
				toast.error($t('requirementsV2.errors.needActivePlan'));
				goto('/dashboard/pricing');
				return;
			}

			const result = await scrubinClient.hunt.createHuntAndActivateFromRequirements(
				requirementId,
				plan.planType as any
			);

			toast.success($t('requirementsV2.success.activated'));
			goto(`/dashboard/hunts/${result.huntId}`);
		} catch (error) {
			console.error('Failed to activate:', error);
			toast.error($t('requirementsV2.errors.failedToActivate'));
		} finally {
			isActivating = false;
		}
	}
</script>

<div class="mx-auto min-h-screen max-w-4xl p-6">
	<!-- Header -->
	<div class="mb-8 flex items-center gap-4">
		<Button
			onclick={() => goto('/dashboard/hunts')}
			variant="outline"
			size="icon"
			class="h-9 w-9"
		>
			<ArrowLeft class="h-4 w-4" />
		</Button>
		<div>
			<h1 class="text-3xl font-bold tracking-tight">{$t('requirementsV2.title')}</h1>
			<p class="text-sm text-muted-foreground">
				{$t('requirementsV2.subtitle')}
			</p>
		</div>
	</div>

	<!-- Stepper -->
	<div class="mb-6">
		<div class="flex items-center justify-between">
			{#each steps as step, index}
				{@const stepAccessible = canAccessStep(index)}
				{@const stepCompleted = isStepCompleted(index)}
				<div class="flex flex-1 items-center">
					<button
						onclick={() => goToStep(index)}
						class="flex flex-col items-center gap-2 transition-all {stepAccessible
							? 'cursor-pointer hover:scale-105'
							: 'cursor-not-allowed opacity-50'}"
						disabled={!stepAccessible}
					>
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all {stepCompleted
								? 'border-primary bg-primary text-primary-foreground'
								: index === currentStep
									? 'border-primary bg-white text-primary'
									: stepAccessible
										? 'border-gray-400 bg-white text-gray-600'
										: 'border-gray-300 bg-white text-gray-400'}"
						>
							{#if stepCompleted}
								<Check class="h-5 w-5" />
							{:else}
								<span class="text-sm font-semibold">{index + 1}</span>
							{/if}
						</div>
						<div class="text-center">
							<div
								class="text-xs font-medium {stepAccessible
									? 'text-gray-900'
									: 'text-gray-400'}"
							>
								{step.title}
							</div>
							<div class="text-[10px] text-gray-500">{step.description}</div>
						</div>
					</button>
					{#if index < steps.length - 1}
						<div
							class="mx-2 h-0.5 flex-1 transition-all {stepCompleted
								? 'bg-primary'
								: 'bg-gray-300'}"
						></div>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<!-- Navigation - Top -->
	<div class="mb-6 flex items-center justify-between rounded-lg border bg-gray-50 p-4">
		<Button onclick={goBack} variant="outline" size="sm" disabled={currentStep === 0}>
			<ArrowLeft class="mr-2 h-4 w-4" />
			{$t('requirementsV2.navigation.previous')}
		</Button>

		<div class="text-sm font-medium text-gray-600">
			{$t('requirementsV2.navigation.step')} {currentStep + 1} {$t('requirementsV2.navigation.of')} {steps.length}
		</div>

		{#if currentStep < steps.length - 1}
			<Button onclick={saveAndNext} size="sm">
				{$t('requirementsV2.navigation.next')}
				<ArrowRight class="ml-2 h-4 w-4" />
			</Button>
		{:else}
			<Button onclick={handleActivate} disabled={isActivating} size="sm">
				{#if isActivating}
					{$t('requirementsV2.navigation.activating')}
				{:else}
					<Check class="mr-2 h-4 w-4" />
					{$t('requirementsV2.navigation.activateHunt')}
				{/if}
			</Button>
		{/if}
	</div>

	<!-- Step Content -->
	<div class="rounded-lg border bg-white p-8 shadow-sm">
		{#if requirement && requirementId}
			{#if currentStep === 0}
				<BasicInfoStep bind:requirement {requirementId} />
			{:else if currentStep === 1}
				<LocationSalaryStep bind:requirement {requirementId} />
			{:else if currentStep === 2}
				<JobDetailsStep bind:requirement {requirementId} />
			{:else if currentStep === 3}
				<TargetingStep bind:requirement {requirementId} />
			{:else if currentStep === 4}
				<PreviewStep {requirement} {requirementId} />
			{/if}
		{/if}
	</div>

	<!-- Navigation - Bottom -->
	<div class="mt-6 flex items-center justify-between">
		<Button onclick={goBack} variant="outline" disabled={currentStep === 0}>
			<ArrowLeft class="mr-2 h-4 w-4" />
			{$t('requirementsV2.navigation.previous')}
		</Button>

		{#if currentStep < steps.length - 1}
			<Button onclick={saveAndNext}>
				{$t('requirementsV2.navigation.next')}
				<ArrowRight class="ml-2 h-4 w-4" />
			</Button>
		{:else}
			<Button onclick={handleActivate} disabled={isActivating}>
				{#if isActivating}
					{$t('requirementsV2.navigation.activating')}
				{:else}
					<Check class="mr-2 h-4 w-4" />
					{$t('requirementsV2.navigation.activateHunt')}
				{/if}
			</Button>
		{/if}
	</div>
</div>
