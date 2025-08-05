<script lang="ts">
	import { getCurrencySymbol } from '$lib/components/payment/payments';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { t } from '$lib/i18n';
	import { scrubinClient } from '@/scrubinClient/client.js';
	import type { CompanyPlanDetails, CompanyPlanSummary } from '@/scrubinClient/index.js';
	import {
		BadgeCheck,
		Calendar,
		CheckCircle,
		InfoIcon,
		MessageSquare,
		Send,
		Sparkles,
		Stethoscope,
		Users
	} from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	// State
	let activePlans = $state<CompanyPlanSummary[]>([]);
	let planDetails = $state<CompanyPlanDetails[]>([]);
	let isLoading = $state(true);
	let error: string | null = $state(null);

	// Contact dialog state
	let contactDialogOpen = $state(false);
	let contactMessage = $state('');
	let isSending = $state(false);

	// Fetch plan details for a specific plan ID
	const fetchPlanDetails = async (planId: number) => {
		try {
			const details = await scrubinClient.company.getPlanDetails(planId);
			planDetails = [...planDetails, details];
		} catch (err) {
			console.error(`Failed to fetch details for plan ${planId}:`, err);
		}
	};

	onMount(async () => {
		try {
			activePlans = await scrubinClient.company.getActivePlans();

			// Fetch details for all active plans
			await Promise.all(activePlans.map((plan) => fetchPlanDetails(plan.id)));

			isLoading = false;
		} catch (err) {
			error = (err as Error).message;
			isLoading = false;
		}
	});

	const openContactDialog = (prefilledMessage = '') => {
		contactMessage = prefilledMessage;
		contactDialogOpen = true;
	};

	const closeContactDialog = () => {
		contactDialogOpen = false;
		contactMessage = '';
	};

	const submitContactForm = async (event: SubmitEvent) => {
		event.preventDefault();
		isSending = true;

		try {
			await scrubinClient.company.requestCustomPlan(contactMessage);
			toast.success($t('pricing.contactForm.success'));
			contactMessage = '';

			setTimeout(() => {
				contactDialogOpen = false;
			}, 2000);
		} catch (e) {
			const errorMessage = e instanceof Error ? e.message : $t('pricing.errors.fetchFailed');
			toast.error(errorMessage);
		} finally {
			isSending = false;
		}
	};

	const handleEndPlan = () => {
		const message = `I would like to end my plan. Please contact me to discuss the termination process.`;
		openContactDialog(message);
	};

	const openCalendar = () => {
		window.open('https://calendar.app.google/VN4kA74b4Xjn6tHN7', '_blank');
	};
</script>

<div class="mx-auto w-full max-w-screen-xl space-y-6">
	<div class="flex items-center justify-between">
		<h2 class="text-3xl font-bold tracking-tight">{$t('pricing.page.title')}</h2>
	</div>
	<p class="text-lg leading-relaxed text-muted-foreground sm:text-xl">
		{$t('pricing.page.subtitle')}
	</p>
	<!-- <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-16"> -->
	<!-- Hero Section -->
	<!-- <div class="mb-8 sm:mb-16"> -->
	<!-- <h1 class="mb-4 text-3xl font-bold text-foreground sm:mb-6">
			<!-- {$t('pricing.page.title')} -->
	<!-- </h1> -->
	<!-- <p class="text-lg leading-relaxed text-muted-foreground sm:text-xl"> -->
	<!-- {$t('pricing.page.subtitle')} -->
	<!-- </p> -->
	<!-- </div> -->

	{#if error}
		<div
			class="mb-6 rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive sm:mb-8"
		>
			{error}
		</div>
	{/if}

	{#if isLoading}
		<div class="my-8 flex justify-center">
			<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
		</div>
	{:else}
		<!-- Active Plans Section -->
		{#if activePlans.length > 0}
			<div class="mb-8 sm:mb-12">
				<h2 class="mb-4 px-2 text-xl font-semibold text-foreground sm:mb-6 sm:px-0 sm:text-2xl">
					{$t('pricing.activePlans.title')}
				</h2>
				<div class="space-y-4 sm:space-y-6">
					{#each activePlans as plan}
						<div
							class="rounded-xl border border-green-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6"
						>
							<div class="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
								<div class="flex-1">
									<div class="mb-2 flex items-center">
										<BadgeCheck class="mr-2 h-4 w-4 flex-shrink-0 text-green-600 sm:h-5 sm:w-5" />
										<h3 class="text-base font-semibold text-foreground sm:text-lg">
											{plan.planType.replace('_', ' ').toUpperCase()}
										</h3>
									</div>
									<p class="text-xs text-muted-foreground sm:text-sm">
										{$t('pricing.activePlans.activeSince')}
										{new Date(plan.dateStarted).toLocaleDateString()}
									</p>

									{#if planDetails.find((d) => d.id === plan.id)}
										{@const pd = planDetails.find((d) => d.id === plan.id)!}

										<!-- Custom Plan Description -->
										{#if pd.customPlanDescription}
											<div class="mt-3 rounded-md bg-primary/5 p-3 sm:mt-4 sm:p-4">
												<div class="mb-2 flex items-center">
													<Sparkles class="mr-2 h-3 w-3 flex-shrink-0 text-primary sm:h-4 sm:w-4" />
													<h4 class="text-xs font-medium text-primary sm:text-sm">
														{$t('pricing.activePlans.customPlanDetails')}
													</h4>
												</div>
												<p class="text-xs leading-relaxed text-muted-foreground sm:text-sm">
													{pd.customPlanDescription}
												</p>
											</div>
										{/if}

										<!-- General Fee -->
										{#if pd.pricingGeneral && pd.pricingGeneral.amount > 0}
											<div class="mt-3">
												<p class="text-xs sm:text-sm">
													<span class="font-medium">{$t('pricing.activePlans.generalFee')}:</span>
													{pd.pricingGeneral.amount}
													{getCurrencySymbol(pd.pricingGeneral.currency)}
												</p>
											</div>
										{/if}

										<!-- Success Fees -->
										{#if pd.pricingSuccess}
											<details class="mt-3 sm:mt-4">
												<summary
													class="cursor-pointer text-xs font-medium text-primary hover:text-primary/80 sm:text-sm"
												>
													{$t('pricing.activePlans.viewSuccessFees')}
												</summary>
												<div class="mt-3 space-y-4">
													<!-- Mobile: Stacked layout, Desktop: Grid -->
													<div class="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
														<!-- Doctors Section -->
														<div class="rounded-md bg-muted/50 p-3 sm:p-4">
															<div class="mb-3 flex items-center">
																<Stethoscope
																	class="mr-2 h-3 w-3 flex-shrink-0 text-primary sm:h-4 sm:w-4"
																/>
																<span class="text-xs font-medium sm:text-sm">
																	{$t('pricing.activePlans.doctorsTitle')}
																</span>
															</div>
															<div class="space-y-2 text-xs sm:space-y-3 sm:text-sm">
																<div class="flex items-start justify-between">
																	<span class="text-muted-foreground">
																		{$t('pricing.activePlans.startFee')}:
																	</span>
																	<div class="ml-2 text-right">
																		<div class="font-medium">
																			{pd.pricingSuccess.doctor.startFee.amount}
																			{getCurrencySymbol(
																				pd.pricingSuccess.doctor.startFee.currency
																			)}
																		</div>
																	</div>
																</div>
																<div class="flex items-start justify-between">
																	<span class="text-muted-foreground">
																		{$t('pricing.activePlans.successFee')}:
																	</span>
																	<div class="ml-2 text-right">
																		<div class="font-medium">
																			{pd.pricingSuccess.doctor.successFee.amount}
																			{getCurrencySymbol(
																				pd.pricingSuccess.doctor.successFee.currency
																			)}
																		</div>
																		<div class="mt-1 text-xs text-muted-foreground">
																			{$t('pricing.activePlans.perHiredCandidate')}
																		</div>
																	</div>
																</div>
															</div>
														</div>

														<!-- Other Professionals Section -->
														<div class="rounded-md bg-muted/50 p-3 sm:p-4">
															<div class="mb-3 flex items-center">
																<Users
																	class="mr-2 h-3 w-3 flex-shrink-0 text-primary sm:h-4 sm:w-4"
																/>
																<span class="text-xs font-medium sm:text-sm">
																	{$t('pricing.activePlans.otherProfessionalsTitle')}
																</span>
															</div>
															<div class="space-y-2 text-xs sm:space-y-3 sm:text-sm">
																<div class="flex items-start justify-between">
																	<span class="text-muted-foreground">
																		{$t('pricing.activePlans.startFee')}:
																	</span>
																	<div class="ml-2 text-right">
																		<div class="font-medium">
																			{pd.pricingSuccess.other.startFee.amount}
																			{getCurrencySymbol(pd.pricingSuccess.other.startFee.currency)}
																		</div>
																	</div>
																</div>
																<div class="flex items-start justify-between">
																	<span class="text-muted-foreground">
																		{$t('pricing.activePlans.successFee')}:
																	</span>
																	<div class="ml-2 text-right">
																		<div class="font-medium">
																			{pd.pricingSuccess.other.successFee.amount}
																			{getCurrencySymbol(
																				pd.pricingSuccess.other.successFee.currency
																			)}
																		</div>
																		<div class="mt-1 text-xs text-muted-foreground">
																			{$t('pricing.activePlans.perHiredCandidate')}
																		</div>
																	</div>
																</div>
															</div>
														</div>
													</div>

													<!-- Success Fee Notice -->
													<div class="flex items-start rounded-md bg-blue-50/50 p-3">
														<InfoIcon
															class="mr-2 mt-0.5 h-3 w-3 flex-shrink-0 text-blue-600 sm:h-4 sm:w-4"
														/>
														<p class="text-xs leading-relaxed text-blue-700 sm:text-sm">
															{$t('pricing.availablePlans.successFeeNotice')}
														</p>
													</div>
												</div>
											</details>
										{/if}
									{/if}
								</div>
								<Button
									variant="outline"
									size="sm"
									onclick={() => handleEndPlan()}
									class="w-full flex-shrink-0 text-xs sm:w-auto sm:text-sm"
								>
									{$t('pricing.activePlans.endPlan')}
								</Button>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Main Content - Only show when no active plans -->

		{#if activePlans.length === 0}
			<div
				class="max-w-4xl rounded-2xl border border-border/50 bg-white p-6 shadow-sm sm:rounded-3xl sm:p-8 lg:p-12"
			>
				<!-- Features -->
				<div class="mb-8 grid grid-cols-1 gap-6 sm:mb-12 sm:grid-cols-2 sm:gap-8">
					<div class="space-y-1">
						<div class="mb-2 flex items-center space-x-3">
							<CheckCircle class="h-4 w-4 flex-shrink-0 text-green-600 sm:h-5 sm:w-5" />
							<h3 class="text-sm font-medium text-foreground sm:text-base">
								{$t('pricing.page.features.customPricing.title')}
							</h3>
						</div>
						<p class="pl-7 text-xs text-muted-foreground sm:pl-8 sm:text-sm">
							{$t('pricing.page.features.customPricing.description')}
						</p>
					</div>

					<div class="space-y-1">
						<div class="mb-2 flex items-center space-x-3">
							<CheckCircle class="h-4 w-4 flex-shrink-0 text-green-600 sm:h-5 sm:w-5" />
							<h3 class="text-sm font-medium text-foreground sm:text-base">
								{$t('pricing.page.features.healthcareSpecialisation.title')}
							</h3>
						</div>
						<p class="pl-7 text-xs text-muted-foreground sm:pl-8 sm:text-sm">
							{$t('pricing.page.features.healthcareSpecialisation.description')}
						</p>
					</div>

					<div class="space-y-1">
						<div class="mb-2 flex items-center space-x-3">
							<CheckCircle class="h-4 w-4 flex-shrink-0 text-green-600 sm:h-5 sm:w-5" />
							<h3 class="text-sm font-medium text-foreground sm:text-base">
								{$t('pricing.page.features.dedicatedSupport.title')}
							</h3>
						</div>
						<p class="pl-7 text-xs text-muted-foreground sm:pl-8 sm:text-sm">
							{$t('pricing.page.features.dedicatedSupport.description')}
						</p>
					</div>

					<div class="space-y-1">
						<div class="mb-2 flex items-center space-x-3">
							<CheckCircle class="h-4 w-4 flex-shrink-0 text-green-600 sm:h-5 sm:w-5" />
							<h3 class="text-sm font-medium text-foreground sm:text-base">
								{$t('pricing.page.features.competitiveRates.title')}
							</h3>
						</div>
						<p class="pl-7 text-xs text-muted-foreground sm:pl-8 sm:text-sm">
							{$t('pricing.page.features.competitiveRates.description')}
						</p>
					</div>
				</div>

				<!-- Divider -->
				<div class="mb-8 h-px bg-border sm:mb-12"></div>

				<!-- Actions -->
				<div class="text-center">
					<h2 class="mb-6 text-xl font-semibold text-foreground sm:mb-8 sm:text-2xl">
						{$t('pricing.page.getStarted.title')}
					</h2>
					<div class="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
						<Button onclick={openCalendar} size="lg" class="w-full sm:w-auto sm:min-w-48">
							<Calendar class="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
							{$t('pricing.page.getStarted.scheduleDemo')}
						</Button>
						<span class="text-xs text-muted-foreground sm:text-sm"
							>{$t('pricing.page.getStarted.or')}</span
						>
						<Button
							onclick={() => openContactDialog()}
							variant="outline"
							size="lg"
							class="w-full sm:w-auto sm:min-w-48"
						>
							<MessageSquare class="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
							{$t('pricing.page.getStarted.sendMessage')}
						</Button>
					</div>
				</div>
			</div>
		{/if}
	{/if}
</div>

<!-- Contact Form Dialog -->
<Dialog.Root bind:open={contactDialogOpen}>
	<Dialog.Content class="mx-4 sm:mx-auto sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="text-base sm:text-lg">{$t('pricing.contactForm.title')}</Dialog.Title>
			<Dialog.Description class="text-sm sm:text-base">
				{$t('pricing.contactForm.description')}
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={submitContactForm}>
			<div class="py-4">
				<Label for="message" class="mb-2 block text-sm font-medium">
					{$t('pricing.contactForm.messageLabel')}
				</Label>
				<Textarea
					id="message"
					bind:value={contactMessage}
					placeholder={$t('pricing.contactForm.messagePlaceholder')}
					required
					rows={5}
					class="w-full resize-none text-sm"
					disabled={isSending}
				/>
			</div>

			<Dialog.Footer class="flex-col gap-2 sm:flex-row sm:gap-0">
				<Button
					type="button"
					variant="outline"
					onclick={closeContactDialog}
					disabled={isSending}
					class="w-full text-sm sm:w-auto"
				>
					{$t('pricing.contactForm.cancel')}
				</Button>
				<Button
					type="submit"
					disabled={isSending || !contactMessage.trim()}
					class="w-full text-sm sm:w-auto"
				>
					{#if isSending}
						<div
							class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"
						></div>
						{$t('pricing.contactForm.sending')}
					{:else}
						<Send class="mr-2 h-4 w-4" />
						{$t('pricing.contactForm.send')}
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
