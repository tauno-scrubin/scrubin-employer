<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { scrubinClient } from '@/scrubinClient/client';
	import type { JobRequirementDto } from '@/scrubinClient';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { ArrowLeft, ArrowRight, Check, Users, Loader2, Info } from 'lucide-svelte';
	import { visible } from '@/components/dashboard/overlay';
	import { t } from '$lib/i18n';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';

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

	// Potential reach state
	let potentialReach = $state<number | null>(null);
	let isLoadingReach = $state(false);
	let reachRequestId = $state(0);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	// Track fields that affect potential reach
	const reachDependencies = $derived({
		professions: requirement?.professionsV2 || [],
		specialization: requirement?.specializationV2 || null,
		workExperience: requirement?.jobRequiredWorkExperience || 0,
		targetCountries: requirement?.countriesOnlyToSearch || []
	});

	// Only show reach after profession is filled
	const shouldShowReach = $derived(
		requirement?.professionsV2 && requirement.professionsV2.length > 0
	);

	onMount(async () => {
		visible.set(true);
		try {
			const idParam = page.params.id;

			if (idParam) {
				// Load existing requirement
				requirementId = parseInt(idParam);
				requirement = await scrubinClient.hunt.getRequirementById(requirementId);
				const hunt = requirement.huntId ? await scrubinClient.hunt.getHuntById(requirement.huntId) : null;

				if (hunt) {
					if (hunt.status === 'ACTIVE' || hunt.status === 'PAUSED') {
						goto(`/dashboard/hunts/${hunt.huntId}`);
						return;
					}
				}
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

	// Fetch potential reach when relevant fields change
	$effect(() => {
		// Only fetch if professions are set and we have a requirementId
		if (!shouldShowReach || !requirementId) {
			potentialReach = null;
			return;
		}

		// Track dependencies to trigger re-runs
		reachDependencies;

		// Clear existing timer
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		// Debounce the API call
		debounceTimer = setTimeout(async () => {
			const currentRequestId = ++reachRequestId;
			isLoadingReach = true;

			try {
				const result = await scrubinClient.hunt.getRequirementReach(requirementId);

				// Only update if this is still the latest request (handles race conditions)
				if (currentRequestId === reachRequestId) {
					potentialReach = result.potentialReach;
				}
			} catch (error) {
				// Fail silently as per requirements
				console.error('Failed to fetch potential reach:', error);
			} finally {
				// Only update loading state if this is still the latest request
				if (currentRequestId === reachRequestId) {
					isLoadingReach = false;
				}
			}
		}, 500); // 500ms debounce delay

		// Cleanup function
		return () => {
			if (debounceTimer) {
				clearTimeout(debounceTimer);
			}
		};
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

	function formatNumber(num: number): string {
		return num >= 1000 ? num.toLocaleString('en-US').replace(/,/g, ' ') : num.toString();
	}
</script>

<div class="mx-auto min-h-screen max-w-4xl p-6">
	<!-- Header with Integrated Stepper -->
	<div class="mb-4 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-100">
		<div class="mb-4 flex items-center gap-3">
			<Button
				onclick={() => goto('/dashboard/hunts')}
				variant="outline"
				size="icon"
				class="h-8 w-8"
			>
				<ArrowLeft class="h-4 w-4" />
			</Button>
			<div>
				<h1 class="text-2xl font-bold tracking-tight">{$t('requirementsV2.title')}</h1>
				<p class="text-xs text-muted-foreground">
					{$t('requirementsV2.subtitle')}
				</p>
			</div>
		</div>

		<!-- Compact Stepper with Names -->
		<div class="flex items-start">
			{#each steps as step, index}
				{@const stepAccessible = canAccessStep(index)}
				{@const stepCompleted = isStepCompleted(index)}

				<!-- Step circle and label -->
				<div class="flex flex-1 flex-col items-center gap-2">
					<div class="flex w-full items-center">
						<!-- Left half line -->
						{#if index > 0}
							<div
								class="h-[2px] flex-1 transition-all duration-300 {isStepCompleted(index - 1)
									? 'bg-primary'
									: 'bg-gray-200'}"
							></div>
						{:else}
							<!-- Invisible spacer for first step to center the circle -->
							<div class="h-[2px] flex-1 opacity-0"></div>
						{/if}

						<!-- Step circle -->
						<button
							onclick={() => goToStep(index)}
							class="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all {stepCompleted
								? 'border-primary bg-primary text-primary-foreground shadow-sm'
								: index === currentStep
									? 'border-primary bg-primary text-primary-foreground shadow-md ring-4 ring-primary/30'
									: stepAccessible
										? 'border-gray-300 bg-white text-gray-600 hover:border-primary/50'
										: 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'}"
							disabled={!stepAccessible}
						>
							{#if stepCompleted}
								<Check class="h-4 w-4" />
							{:else}
								<span class="text-xs font-bold">{index + 1}</span>
							{/if}
						</button>

						<!-- Right half line -->
						{#if index < steps.length - 1}
							<div
								class="h-[2px] flex-1 transition-all duration-300 {stepCompleted
									? 'bg-primary'
									: 'bg-gray-200'}"
							></div>
						{:else}
							<!-- Invisible spacer for last step to center the circle -->
							<div class="h-[2px] flex-1 opacity-0"></div>
						{/if}
					</div>

					<span
						class="max-w-[80px] text-center text-[10px] leading-tight transition-all {stepAccessible
							? index === currentStep
								? 'font-bold text-primary'
								: 'font-medium text-gray-600'
							: 'font-medium text-gray-400'}"
					>
						{step.title}
					</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- Sticky Navigation Bar -->
	<div class="sticky top-0 z-10 mb-4 flex items-center justify-between rounded-lg bg-gradient-to-r from-gray-50 to-gray-100/50 p-3 shadow-sm ring-1 ring-gray-200/50 backdrop-blur-sm">
		<Button onclick={goBack} variant="outline" size="sm" disabled={currentStep === 0}>
			<ArrowLeft class="mr-1.5 h-3.5 w-3.5" />
			{$t('requirementsV2.navigation.previous')}
		</Button>

		<!-- Potential reach indicator (compact) -->
		{#if shouldShowReach}
			<Tooltip.Root>
				<Tooltip.Trigger>
					<div class="flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-xs shadow-sm ring-1 ring-gray-200/50 transition-all hover:shadow-md">
						<Users class="h-3.5 w-3.5 text-blue-600" />
						<span class="font-semibold text-gray-800">
							{potentialReach !== null ? formatNumber(potentialReach) : '—'}
						</span>
						{#if isLoadingReach}
							<Loader2 class="h-3 w-3 animate-spin text-blue-500" />
						{/if}
					</div>
				</Tooltip.Trigger>
				<Tooltip.Content side="bottom">
					<p class="text-sm">
						<span class="font-medium">{$t('requirementsV2.preview.potentialReachTooltipTitle')}</span><br />
						{$t('requirementsV2.preview.potentialReachTooltipDescription')}
					</p>
				</Tooltip.Content>
			</Tooltip.Root>
		{/if}

		{#if currentStep < steps.length - 1}
			<Button onclick={saveAndNext} size="sm">
				{$t('requirementsV2.navigation.next')}
				<ArrowRight class="ml-1.5 h-3.5 w-3.5" />
			</Button>
		{:else}
			<Button onclick={handleActivate} disabled={isActivating} size="sm">
				{#if isActivating}
					{$t('requirementsV2.navigation.activating')}
				{:else}
					<Check class="mr-1.5 h-3.5 w-3.5" />
					{$t('requirementsV2.navigation.activateHunt')}
				{/if}
			</Button>
		{/if}
	</div>

	<!-- Step Content -->
	<div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm ring-1 ring-gray-100/50">
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
</div>
