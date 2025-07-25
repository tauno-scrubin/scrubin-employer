<script lang="ts">
	import { getCurrencySymbol } from '$lib/components/payment/payments';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { t } from '$lib/i18n';
	import { scrubinClient } from '@/scrubinClient/client.js';
	import type {
		AvailablePlansResponse,
		CompanyPlanDetails,
		CompanyPlanSummary
	} from '@/scrubinClient/index.js';
	import {
		ArrowRight,
		BadgeCheck,
		InfoIcon,
		Send,
		Sparkles,
		Stethoscope,
		Users
	} from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { fade } from 'svelte/transition';
	import { currentUserCompany } from '../../../../lib/scrubinClient/client';

	let availablePlans = $state<AvailablePlansResponse['plans']>([]);
	let activePlans = $state<CompanyPlanSummary[]>([]);
	let startingFee = $state(0);
	let currency = $state('');
	let planDetails = $state<CompanyPlanDetails[]>([]);
	let isLoading = $state(true);
	let error: string | null = $state(null);

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
			const availablePlansResponse = await scrubinClient.company.getAvailablePlans();
			availablePlans = availablePlansResponse.plans;
			activePlans = await scrubinClient.company.getActivePlans();
			const successFeePlan = availablePlans.find((plan) => plan.planType === 'success_fee');
			if (successFeePlan) {
				startingFee = successFeePlan.pricingSuccess.other.startFee.amount;
				currency = successFeePlan.pricingSuccess.other.startFee.currency;
			}

			// Fetch details for all active plans
			await Promise.all(activePlans.map((plan) => fetchPlanDetails(plan.id)));

			isLoading = false;
		} catch (err) {
			error = (err as Error).message;
			isLoading = false;
		}
	});

	const handleStartPlan = async (planType: string) => {
		try {
			await scrubinClient.company.startPlan(planType);
			activePlans = await scrubinClient.company.getActivePlans();

			// Fetch details for newly activated plan
			for (const plan of activePlans) {
				if (!planDetails.find((d) => d.id === plan.id)) {
					await fetchPlanDetails(plan.id);
				}
			}
		} catch (err) {
			error = (err as Error).message;
		}
	};

	const handleEndPlan = async (id: number) => {
		try {
			await scrubinClient.company.endPlan(id);
			activePlans = await scrubinClient.company.getActivePlans();
		} catch (err) {
			error = (err as Error).message;
		}
	};

	// Contact dialog state
	let contactDialogOpen = $state(false);
	let contactMessage = $state('');
	let isSending = $state(false);
	let sendSuccess = $state(false);
	let sendError = $state<string | null>(null);

	const openContactDialog = () => {
		contactDialogOpen = true;
	};

	const closeContactDialog = () => {
		contactDialogOpen = false;
	};

	const submitContactForm = async (event: SubmitEvent) => {
		event.preventDefault();
		isSending = true;
		sendSuccess = false;
		sendError = null;

		try {
			// Use requestCustomPlan method instead of submitFeedback
			await scrubinClient.company.requestCustomPlan(contactMessage);

			sendSuccess = true;
			toast.success($t('pricing.contactForm.success'));

			// Reset form
			contactMessage = '';

			// Close dialog after a short delay
			setTimeout(() => {
				contactDialogOpen = false;
				sendSuccess = false;
			}, 2000);
		} catch (e) {
			sendError = e instanceof Error ? e.message : $t('pricing.errors.fetchFailed');
			toast.error(sendError);
		} finally {
			isSending = false;
		}
	};
</script>

<div class="mx-auto max-w-4xl px-4 py-8">
	{#if error}
		<div class="mb-6 rounded-md border border-destructive bg-destructive/10 p-4 text-destructive">
			{error}
		</div>
	{/if}

	<!-- Page Header -->
	<div class="mb-8">
		<h1 class="text-2xl font-bold">{$t('pricing.title')}</h1>
		<p class="mt-2 text-lg text-muted-foreground">
			{$t('pricing.subtitle')}
		</p>

		<!-- Key Pricing Info Banner -->
		{#if activePlans.length < 1 && $currentUserCompany?.countryIso !== 'EST' && startingFee !== undefined}
			<div class="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-6">
				<div class="flex items-center">
					<Sparkles class="mr-3 h-6 w-6 text-primary" />
					<div>
						<h2 class="text-lg font-semibold text-primary">
							{#if startingFee > 0}
								{$t('pricing.startingFee.title', {
									amount: startingFee?.toString(),
									currency: getCurrencySymbol(currency)
								})}
							{:else}
								No starting fee required
							{/if}
						</h2>
						<p class="text-sm text-muted-foreground">
							{#if startingFee > 0}
								{$t('pricing.startingFee.withFee', {
									amount: startingFee?.toString(),
									currency: getCurrencySymbol(currency)
								})}
							{:else}
								{$t('pricing.startingFee.withoutFee')}
							{/if}
						</p>
					</div>
				</div>
			</div>
		{/if}
	</div>

	{#if isLoading}
		<div class="my-8 flex justify-center">
			<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
		</div>
	{:else}
		<!-- Current Plan Status -->
		{#if activePlans.length > 0}
			<section class="mb-10">
				<h2 class="mb-6 text-xl font-semibold">{$t('pricing.activePlans.title')}</h2>
				<div class="space-y-6">
					{#each activePlans as plan}
						<div transition:fade class="rounded-lg border border-green-400 p-6 shadow-sm">
							<div class="mb-4 flex items-start justify-between">
								<div class="flex-1">
									<div class="flex items-center">
										<BadgeCheck class="mr-2 h-5 w-5 text-green-600" />
										<h3 class="text-lg font-semibold">
											{plan.planType.replace('_', ' ').toUpperCase()}
										</h3>
									</div>
									<p class="mt-1 text-sm text-muted-foreground">
										{$t('pricing.activePlans.activeSince')}
										{new Date(plan.dateStarted).toLocaleDateString()}
									</p>

									{#if planDetails.find((d) => d.id === plan.id)}
										{@const pd = planDetails.find((d) => d.id === plan.id)!}

										<!-- Custom Plan Description -->
										{#if pd.customPlanDescription}
											<div class="mt-4 rounded-md bg-primary/5 p-4">
												<div class="mb-2 flex items-center">
													<Sparkles class="mr-2 h-4 w-4 text-primary" />
													<h4 class="text-sm font-medium text-primary">
														{$t('pricing.activePlans.customPlanDetails')}
													</h4>
												</div>
												<p class="text-sm text-muted-foreground">
													{pd.customPlanDescription}
												</p>
											</div>
										{/if}

										<!-- General Fee -->
										{#if pd.pricingGeneral && pd.pricingGeneral.amount > 0}
											<div class="mt-3">
												<p class="text-sm">
													<span class="font-medium">{$t('pricing.activePlans.generalFee')}:</span>
													{pd.pricingGeneral.amount}
													{getCurrencySymbol(pd.pricingGeneral.currency)}
												</p>
											</div>
										{/if}

										<!-- Success Fees -->
										{#if pd.pricingSuccess}
											<details class="mt-4">
												<summary class="cursor-pointer text-sm font-medium text-primary"
													>{$t('pricing.activePlans.viewSuccessFees')}</summary
												>
												<div class="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
													<div class="rounded-md bg-muted/50 p-4">
														<div class="mb-3 flex items-center">
															<Stethoscope class="mr-2 h-4 w-4 text-primary" />
															<span class="font-medium"
																>{$t('pricing.activePlans.doctorsTitle')}</span
															>
														</div>
														<div class="space-y-3 text-sm">
															<div class="flex items-start justify-between">
																<span class="text-muted-foreground"
																	>{$t('pricing.activePlans.startFee')}:</span
																>
																<div class="text-right">
																	<div class="font-medium">
																		{pd.pricingSuccess.doctor.startFee.amount}
																		{getCurrencySymbol(pd.pricingSuccess.doctor.startFee.currency)}
																	</div>
																</div>
															</div>
															<div class="flex items-start justify-between">
																<span class="text-muted-foreground"
																	>{$t('pricing.activePlans.successFee')}:</span
																>
																<div class="text-right">
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

													<div class="rounded-md bg-muted/50 p-4">
														<div class="mb-3 flex items-center">
															<Users class="mr-2 h-4 w-4 text-primary" />
															<span class="font-medium"
																>{$t('pricing.activePlans.otherProfessionalsTitle')}</span
															>
														</div>
														<div class="space-y-3 text-sm">
															<div class="flex items-start justify-between">
																<span class="text-muted-foreground"
																	>{$t('pricing.activePlans.startFee')}:</span
																>
																<div class="text-right">
																	<div class="font-medium">
																		{pd.pricingSuccess.other.startFee.amount}
																		{getCurrencySymbol(pd.pricingSuccess.other.startFee.currency)}
																	</div>
																</div>
															</div>
															<div class="flex items-start justify-between">
																<span class="text-muted-foreground"
																	>{$t('pricing.activePlans.successFee')}:</span
																>
																<div class="text-right">
																	<div class="font-medium">
																		{pd.pricingSuccess.other.successFee.amount}
																		{getCurrencySymbol(pd.pricingSuccess.other.successFee.currency)}
																	</div>
																	<div class="mt-1 text-xs text-muted-foreground">
																		{$t('pricing.activePlans.perHiredCandidate')}
																	</div>
																</div>
															</div>
														</div>
													</div>
												</div>

												<div class="mt-4 flex items-start rounded-md bg-blue-50/50 p-3">
													<InfoIcon class="mr-2 mt-0.5 h-4 w-4 text-blue-600" />
													<p class="text-sm text-blue-700">
														{$t('pricing.availablePlans.successFeeNotice')}
													</p>
												</div>
											</details>
										{/if}
									{/if}
								</div>
								<Button variant="outline" size="sm" onclick={() => handleEndPlan(plan.id)}>
									{$t('pricing.activePlans.endPlan')}
								</Button>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Available Plans Section -->
		{#if availablePlans.filter((plan) => !activePlans.find((activePlan) => activePlan.planType === plan.planType)).length > 0}
			<section class="mb-10">
				<h2 class="mb-6 text-xl font-semibold">{$t('pricing.availablePlans.title')}</h2>
				<div class="space-y-6">
					{#each availablePlans.filter((plan) => !activePlans.find((activePlan) => activePlan.planType === plan.planType)) as plan}
						<div class="rounded-lg border border-border p-6">
							<div class="mb-6 flex items-start justify-between">
								<div class="flex-1">
									<h3 class="text-lg font-semibold">
										{plan.planType.replace('_', ' ').toUpperCase()}
									</h3>
									{#if plan.pricingGeneral && plan.pricingGeneral.amount > 0}
										<p class="mt-1 text-sm text-muted-foreground">
											{$t('pricing.availablePlans.generalFee')}: {plan.pricingGeneral.amount || 0}
											{getCurrencySymbol(plan.pricingGeneral.currency)}
										</p>
									{:else}
										<p class="mt-1 text-sm text-muted-foreground">
											{$t('pricing.availablePlans.noGeneralFee')}
										</p>
									{/if}
								</div>
								<Button onclick={() => handleStartPlan(plan.planType)} class="ml-4">
									{$t('pricing.availablePlans.startPlan')}
								</Button>
							</div>

							{#if plan.pricingSuccess}
								<div class="border-t pt-4">
									<h4 class="mb-4 text-sm font-medium">
										{$t('pricing.availablePlans.successFees')}
									</h4>
									<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
										<div class="rounded-md bg-muted/50 p-4">
											<div class="mb-3 flex items-center">
												<Stethoscope class="mr-2 h-4 w-4 text-primary" />
												<span class="font-medium">{$t('pricing.activePlans.doctorsTitle')}</span>
											</div>
											<div class="space-y-3 text-sm">
												<div class="flex items-start justify-between">
													<span class="text-muted-foreground"
														>{$t('pricing.activePlans.startFee')}:</span
													>
													<div class="text-right">
														<div class="font-medium">
															{plan.pricingSuccess.doctor.startFee.amount}
															{getCurrencySymbol(plan.pricingSuccess.doctor.startFee.currency)}
														</div>
														{#if plan.pricingSuccess?.doctor?.startFee?.vatAmount && plan.pricingSuccess.doctor.startFee.vatAmount > 0}
															<div class="mt-1 text-xs text-muted-foreground">
																{$t('pricing.availablePlans.vatLabel', {
																	percentage:
																		plan.pricingSuccess.doctor.startFee.vatPercentage?.toString() ||
																		'0'
																})}
															</div>
														{/if}
													</div>
												</div>
												<div class="flex items-start justify-between">
													<span class="text-muted-foreground"
														>{$t('pricing.activePlans.successFee')}:</span
													>
													<div class="text-right">
														<div class="font-medium">
															{plan.pricingSuccess.doctor.successFee.amount}
															{getCurrencySymbol(plan.pricingSuccess.doctor.successFee.currency)}
														</div>
														{#if plan.pricingSuccess?.doctor?.successFee?.vatAmount && plan.pricingSuccess.doctor.successFee.vatAmount > 0}
															<div class="mt-1 text-xs text-muted-foreground">
																{$t('pricing.availablePlans.vatLabel', {
																	percentage:
																		plan.pricingSuccess.doctor.successFee.vatPercentage?.toString() ||
																		'0'
																})}
															</div>
														{/if}
														<div class="mt-1 text-xs text-muted-foreground">
															{$t('pricing.activePlans.perHiredCandidate')}
														</div>
													</div>
												</div>
											</div>
										</div>

										<div class="rounded-md bg-muted/50 p-4">
											<div class="mb-3 flex items-center">
												<Users class="mr-2 h-4 w-4 text-primary" />
												<span class="font-medium"
													>{$t('pricing.activePlans.otherProfessionalsTitle')}</span
												>
											</div>
											<div class="space-y-3 text-sm">
												<div class="flex items-start justify-between">
													<span class="text-muted-foreground"
														>{$t('pricing.activePlans.startFee')}:</span
													>
													<div class="text-right">
														<div class="font-medium">
															{plan.pricingSuccess.other.startFee.amount}
															{getCurrencySymbol(plan.pricingSuccess.other.startFee.currency)}
														</div>
														{#if plan.pricingSuccess?.other?.startFee?.vatAmount && plan.pricingSuccess.other.startFee.vatAmount > 0}
															<div class="mt-1 text-xs text-muted-foreground">
																{$t('pricing.availablePlans.vatLabel', {
																	percentage:
																		plan.pricingSuccess.other.startFee.vatPercentage?.toString() ||
																		'0'
																})}
															</div>
														{/if}
													</div>
												</div>
												<div class="flex items-start justify-between">
													<span class="text-muted-foreground"
														>{$t('pricing.activePlans.successFee')}:</span
													>
													<div class="text-right">
														<div class="font-medium">
															{plan.pricingSuccess.other.successFee.amount}
															{getCurrencySymbol(plan.pricingSuccess.other.successFee.currency)}
														</div>
														{#if plan.pricingSuccess?.other?.successFee?.vatAmount && plan.pricingSuccess.other.successFee.vatAmount > 0}
															<div class="mt-1 text-xs text-muted-foreground">
																{$t('pricing.availablePlans.vatLabel', {
																	percentage:
																		plan.pricingSuccess.other.successFee.vatPercentage?.toString() ||
																		'0'
																})}
															</div>
														{/if}
														<div class="mt-1 text-xs text-muted-foreground">
															{$t('pricing.activePlans.perHiredCandidate')}
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>

									<div class="mt-4 flex items-start rounded-md bg-blue-50/50 p-3">
										<InfoIcon class="mr-2 mt-0.5 h-4 w-4 text-blue-600" />
										<p class="text-sm text-blue-700">
											{$t('pricing.availablePlans.successFeeNotice')}
										</p>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Custom Solutions Section -->
		<section>
			<div
				class="rounded-lg border border-border bg-gradient-to-r from-primary/5 to-primary/10 p-6"
			>
				<div class="flex items-start justify-between">
					<div class="flex-1">
						<h2 class="text-lg font-semibold">{$t('pricing.customSolutions.title')}</h2>
						<p class="mt-2 text-muted-foreground">
							{$t('pricing.customSolutions.description')}
						</p>
					</div>
					<Button
						onclick={openContactDialog}
						variant="default"
						class="ml-4 bg-primary hover:bg-primary/90"
					>
						{$t('pricing.customSolutions.contactUs')}
					</Button>
				</div>
			</div>
		</section>
	{/if}
</div>

<!-- Contact Form Dialog -->
<Dialog.Root bind:open={contactDialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{$t('pricing.contactForm.title')}</Dialog.Title>
			<Dialog.Description>
				{$t('pricing.contactForm.description')}
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={submitContactForm}>
			<div class="space-y-4 py-4">
				<div class="space-y-2">
					<Label for="message" class="text-sm font-medium"
						>{$t('pricing.contactForm.messageLabel')}</Label
					>
					<Textarea
						id="message"
						bind:value={contactMessage}
						placeholder={$t('pricing.contactForm.messagePlaceholder')}
						required
						rows={6}
						class="w-full resize-none"
						disabled={isSending}
					/>
				</div>
			</div>

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={closeContactDialog} disabled={isSending}>
					{$t('pricing.contactForm.cancel')}
				</Button>
				<Button type="submit" disabled={isSending}>
					{#if isSending}
						<div class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background"></div>
						{$t('pricing.contactForm.sending')}
					{:else}
						<Send class="mr-2 h-4 w-4" />
						{$t('pricing.contactForm.send')}
					{/if}
				</Button>

				{#if sendSuccess}
					<span class="text-sm text-green-600">{$t('pricing.contactForm.success')}</span>
				{/if}
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
