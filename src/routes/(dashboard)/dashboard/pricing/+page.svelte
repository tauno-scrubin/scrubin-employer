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

<div class="mx-auto max-w-3xl px-4 py-8">
	{#if error}
		<div class="mb-6 rounded-md border border-destructive bg-destructive/10 p-4 text-destructive">
			{error}
		</div>
	{/if}

	<div class="mb-8">
		<h2 class="text-xl font-bold">{$t('pricing.title')}</h2>
		<p class="mt-1 text-muted-foreground">
			{$t('pricing.subtitle')}
		</p>
	</div>

	<!-- Active Plans Section -->
	{#if activePlans.length > 0}
		<div transition:fade class="mb-8">
			<h3 class="mb-4 text-lg font-semibold">{$t('pricing.activePlans.title')}</h3>
			<div class="space-y-4">
				{#each activePlans as plan}
					<div class="rounded-lg border border-green-500 bg-green-50/30 p-6 shadow-sm">
						<div class="mb-4 flex items-start justify-between">
							<div>
								<div class="flex items-center">
									<BadgeCheck class="mr-2 h-5 w-5 text-primary" />
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
									{#if pd.customPlanDescription}
										<div class="mt-3 p-1">
											<div class="mb-1 flex items-center">
												<Sparkles class="mr-2 h-4 w-4 text-primary/70" />
												<h4 class="text-sm font-medium text-primary/80">
													{$t('pricing.activePlans.customPlanDetails')}
												</h4>
											</div>
											<div class="flex items-start pl-6">
												<p class="text-sm text-muted-foreground">
													{pd.customPlanDescription}
												</p>
											</div>
										</div>
									{/if}

									{#if pd.pricingGeneral && pd.pricingGeneral.amount > 0}
										<p class="mt-2 text-sm">
											{$t('pricing.activePlans.generalFee')}: {pd.pricingGeneral.amount}
											{getCurrencySymbol(pd.pricingGeneral.currency)}
										</p>
									{/if}

									{#if pd.pricingSuccess}
										<details class="mt-2">
											<summary class="cursor-pointer text-sm font-medium"
												>{$t('pricing.activePlans.viewSuccessFees')}</summary
											>
											<div class="mt-2 space-y-2 pl-4 text-sm">
												<div>
													<p class="font-medium">{$t('pricing.activePlans.doctorsTitle')}:</p>
													<div class="pl-2">
														<p>
															{$t('pricing.activePlans.startFee')}: {pd.pricingSuccess.doctor
																.startFee.amount}
															{getCurrencySymbol(pd.pricingSuccess.doctor.startFee.currency)}
														</p>
														<p>
															{$t('pricing.activePlans.successFee')}: {pd.pricingSuccess.doctor
																.successFee.amount}
															{getCurrencySymbol(pd.pricingSuccess.doctor.successFee.currency)}
														</p>
													</div>
												</div>
												<div>
													<p class="font-medium">
														{$t('pricing.activePlans.otherProfessionalsTitle')}:
													</p>
													<div class="pl-2">
														<p>
															{$t('pricing.activePlans.startFee')}: {pd.pricingSuccess.other
																.startFee.amount}
															{getCurrencySymbol(pd.pricingSuccess.other.startFee.currency)}
														</p>
														<p>
															{$t('pricing.activePlans.successFee')}: {pd.pricingSuccess.other
																.successFee.amount}
															{getCurrencySymbol(pd.pricingSuccess.other.successFee.currency)}
														</p>
													</div>
												</div>
											</div>
										</details>

										<div class="mt-3 text-sm text-muted-foreground">
											<div class="flex items-start">
												<InfoIcon class="mr-2 mt-0.5 h-5 w-5 text-primary" />
												<span>{$t('pricing.availablePlans.successFeeNotice')}</span>
											</div>
										</div>

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
		</div>
	{/if}

	{#if activePlans.length < 1 && $currentUserCompany?.countryIso !== 'EST'}
		<div class="mb-10 rounded-lg border border-border p-6">
			<div class="mb-3 flex items-center">
				<Sparkles class="mr-2 h-6 w-6 text-primary" />
				<h1 class="text-lg font-bold text-primary">
					{$t('pricing.startingFee.title', {
						amount: startingFee?.toString(),
						currency: getCurrencySymbol(currency)
					})}
				</h1>
			</div>
			{#if startingFee > 0}
				<p class="mb-4 text-base">
					{$t('pricing.startingFee.withFee', {
						amount: startingFee?.toString(),
						currency: getCurrencySymbol(currency)
					})}
				</p>
			{:else}
				<p class="mb-4 text-base">
					{$t('pricing.startingFee.withoutFee')}
				</p>
			{/if}
			<div class="flex items-center text-sm text-neutral-500">
				<span>{$t('pricing.startingFee.payWhenSuccessful')}</span>
				<ArrowRight class="ml-2 h-4 w-4" />
			</div>
		</div>
	{/if}

	<!-- Available Plans Section -->
	{#if isLoading}
		<div class="my-8 flex justify-center">
			<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
		</div>
	{:else if availablePlans.filter((plan) => !activePlans.find((activePlan) => activePlan.planType === plan.planType)).length > 0}
		<div class="mb-8 space-y-6">
			<h3 class="text-lg font-semibold">{$t('pricing.availablePlans.title')}</h3>
			{#each availablePlans.filter((plan) => !activePlans.find((activePlan) => activePlan.planType === plan.planType)) as plan}
				<div class="rounded-lg border border-border p-6">
					<div class="mb-4 flex items-start justify-between">
						<div>
							<h3 class="text-lg font-semibold">{plan.planType.replace('_', ' ').toUpperCase()}</h3>
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
						<Button onclick={() => handleStartPlan(plan.planType)}
							>{$t('pricing.availablePlans.startPlan')}</Button
						>
					</div>

					{#if plan.pricingSuccess}
						<div class="mt-4">
							<h4 class="mb-2 text-sm font-medium">{$t('pricing.availablePlans.successFees')}</h4>
							<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div class="rounded-md bg-muted/50 p-4">
									<div class="mb-2 flex items-center">
										<Stethoscope class="mr-2 h-4 w-4 text-primary" />
										<span class="font-medium">{$t('pricing.activePlans.doctorsTitle')}</span>
									</div>
									<div class="space-y-1 text-sm">
										<div class="flex justify-between">
											<span>{$t('pricing.activePlans.startFee')}:</span>
											<span>
												{#if plan.pricingSuccess?.doctor?.startFee?.vatAmount && plan.pricingSuccess.doctor.startFee.vatAmount > 0}
													{plan.pricingSuccess.doctor.startFee.amount}
													{getCurrencySymbol(plan.pricingSuccess.doctor.startFee.currency)}
													<span class="text-xs text-muted-foreground">
														{$t('pricing.availablePlans.vatLabel', {
															percentage:
																plan.pricingSuccess.doctor.startFee.vatPercentage?.toString() || '0'
														})}
													</span>
												{:else}
													{plan.pricingSuccess.doctor.startFee.amount}
													{getCurrencySymbol(plan.pricingSuccess.doctor.startFee.currency)}
												{/if}
											</span>
										</div>
										<div class="flex justify-between">
											<span>{$t('pricing.activePlans.successFee')}:</span>
											<span>
												{#if plan.pricingSuccess?.doctor?.successFee?.vatAmount && plan.pricingSuccess.doctor.successFee.vatAmount > 0}
													{plan.pricingSuccess.doctor.successFee.amount}
													{getCurrencySymbol(plan.pricingSuccess.doctor.successFee.currency)}
													<span class="text-xs text-muted-foreground">
														{$t('pricing.availablePlans.vatLabel', {
															percentage:
																plan.pricingSuccess.doctor.successFee.vatPercentage?.toString() ||
																'0'
														})}
													</span>
												{:else}
													{plan.pricingSuccess.doctor.successFee.amount}
													{getCurrencySymbol(plan.pricingSuccess.doctor.successFee.currency)}
												{/if}
											</span>
										</div>
									</div>
								</div>

								<div class="rounded-md bg-muted/50 p-4">
									<div class="mb-2 flex items-center">
										<Users class="mr-2 h-4 w-4 text-primary" />
										<span class="font-medium"
											>{$t('pricing.activePlans.otherProfessionalsTitle')}</span
										>
									</div>
									<div class="space-y-1 text-sm">
										<div class="flex justify-between">
											<span>{$t('pricing.activePlans.startFee')}:</span>
											<span>
												{#if plan.pricingSuccess?.other?.startFee?.vatAmount && plan.pricingSuccess.other.startFee.vatAmount > 0}
													{plan.pricingSuccess.other.startFee.amount}
													{getCurrencySymbol(plan.pricingSuccess.other.startFee.currency)}
													<span class="text-xs text-muted-foreground">
														{$t('pricing.availablePlans.vatLabel', {
															percentage:
																plan.pricingSuccess.other.startFee.vatPercentage?.toString() || '0'
														})}
													</span>
												{:else}
													{plan.pricingSuccess.other.startFee.amount}
													{getCurrencySymbol(plan.pricingSuccess.other.startFee.currency)}
												{/if}
											</span>
										</div>
										<div class="flex justify-between">
											<span>{$t('pricing.activePlans.successFee')}:</span>
											<span>
												{#if plan.pricingSuccess?.other?.successFee?.vatAmount && plan.pricingSuccess.other.successFee.vatAmount > 0}
													{plan.pricingSuccess.other.successFee.amount}
													{getCurrencySymbol(plan.pricingSuccess.other.successFee.currency)}
													<span class="text-xs text-muted-foreground">
														{$t('pricing.availablePlans.vatLabel', {
															percentage:
																plan.pricingSuccess.other.successFee.vatPercentage?.toString() ||
																'0'
														})}
													</span>
												{:else}
													{plan.pricingSuccess.other.successFee.amount}
													{getCurrencySymbol(plan.pricingSuccess.other.successFee.currency)}
												{/if}
											</span>
										</div>
									</div>
								</div>
							</div>
							<div class="mt-3 text-sm text-muted-foreground">
								<div class="flex items-start">
									<InfoIcon class="mr-2 mt-0.5 h-5 w-5 text-primary" />
									<span>{$t('pricing.availablePlans.successFeeNotice')}</span>
								</div>
							</div>
						</div>
					{/if}
				</div>
			{/each}

			<div class="rounded-lg border border-border p-6">
				<div class="mb-4 flex items-start justify-between">
					<div>
						<h3 class="text-lg font-semibold">{$t('pricing.customSolutions.title')}</h3>
						<p class="mt-1 text-sm text-muted-foreground">
							{$t('pricing.customSolutions.description')}
						</p>
					</div>
					<Button
						onclick={openContactDialog}
						variant="default"
						class="bg-primary hover:bg-primary/90"
					>
						{$t('pricing.customSolutions.contactUs')}
					</Button>
				</div>
			</div>
		</div>
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
