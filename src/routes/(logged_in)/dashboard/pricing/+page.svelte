<script lang="ts">
	import { getCurrencySymbol } from '$lib/components/payment/payments';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import PlanSelection from '$lib/components/dashboard/planSelection.svelte';
	import { t } from '$lib/i18n';
	import { scrubinClient } from '@/scrubinClient/client.js';
	import type {
		CompanyPlanDetails,
		CompanyPlanSummary,
		CompanyBilling,
		InvoiceDto,
		AvailablePlan
	} from '@/scrubinClient/index.js';
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
	let billing: CompanyBilling | null = $state(null);
	let subscriptions: Array<{ id: string; status: string }> = $state([]);
	let invoices = $state<InvoiceDto[]>([]);

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

	// Function to refresh active plans
	const refreshActivePlans = async () => {
		try {
			const active = await scrubinClient.company.getActivePlans();
			activePlans = active;
		} catch (err) {
			console.error('Failed to refresh active plans:', err);
		}
	};

	onMount(async () => {
		try {
			const [active, bill] = await Promise.all([
				scrubinClient.company.getActivePlans(),
				scrubinClient.company.getBilling()
			]);

			activePlans = active;
			billing = bill;

			if (bill?.stripeCustomerId) {
				scrubinClient.company
					.getStripeSubscriptions()
					.then((subs) => (subscriptions = subs?.map((s: any) => ({ id: s.id, status: s.status }))))
					.catch(() => (subscriptions = []));

				scrubinClient.company
					.getStripeInvoices()
					.then((inv) => (invoices = inv as InvoiceDto[]))
					.catch(() => (invoices = []));
			}

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

	const manageSubscription = async () => {
		try {
			const { url } = await scrubinClient.company.createStripePortalSession();
			if (url) {
				window.location.href = url;
			}
		} catch (e) {
			const errorMessage = e instanceof Error ? e.message : $t('pricing.errors.fetchFailed');
			toast.error(errorMessage);
		}
	};

	const handlePlanSelected = (plan: AvailablePlan) => {
		console.log('Plan selected:', plan);
	};

	const handleCustomPlanRequested = () => {
		openContactDialog();
	};
</script>

<div class="mb-18 mx-auto w-full max-w-screen-xl space-y-6 mb-16">
	<div class="flex items-center justify-between">
		<h2 class="text-3xl font-bold tracking-tight">{$t('pricing.page.title')}</h2>
	</div>
	<p class="text-base text-muted-foreground">
		{$t('pricing.page.subtitle')}
	</p>
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
		<!-- Billing subscription summary -->
		<!-- {#if billing?.stripeCustomerId && subscriptions.length > 0}
			<div class="mb-6 rounded-xl border border-border/50 bg-white p-4 sm:p-6">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p class="text-sm text-muted-foreground">
							{$t('pricing.activePlans.billingStatus') || 'Billing'}
						</p>
						<p class="text-sm">
							<strong>{$t('pricing.activePlans.subscription')}</strong> — {subscriptions[0].status.toUpperCase()}
						</p>
					</div>
					<Button size="sm" onclick={manageSubscription} class="w-full sm:w-auto">
						{$t('pricing.activePlans.manageSubscription') || 'Manage subscription'}
					</Button>
				</div>
			</div>
		{/if} -->
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
										{@const planActivationDate = new Date(plan.dateStarted)}
										{@const isOldSuccessFee = planActivationDate < new Date('2024-10-21')}
										{@const isOldStartFee = planActivationDate < new Date('2024-10-22')}

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

										<!-- General Fee / Base Fee -->
										{#if pd.pricingGeneral}
											<div class="mt-3">
												<p class="text-xs sm:text-sm">
													<span class="font-medium">
														{isOldStartFee
															? $t('pricing.activePlans.generalFee')
															: $t('pricing.activePlans.baseFee')}:
													</span>
													{pd.pricingGeneral.amount}
													{getCurrencySymbol(pd.pricingGeneral.currency)}
													{$t('pricing.availablePlans.vatLabel', { percentage: '24' })}
												</p>
											</div>
										{:else if pd.pricingSuccess && !isOldStartFee}
											<!-- For new success fee plans, show base fee from startFee -->
											<div class="mt-3">
												<p class="text-xs sm:text-sm">
													<span class="font-medium">
														{$t('pricing.activePlans.baseFee')}:
													</span>
													{pd.pricingSuccess.doctor.startFee.amount}
													{getCurrencySymbol(pd.pricingSuccess.doctor.startFee.currency)}
													{$t('pricing.availablePlans.vatLabel', { percentage: '24' })}
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
																{#if isOldStartFee}
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
																{/if}
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
																{#if isOldStartFee}
																	<div class="flex items-start justify-between">
																		<span class="text-muted-foreground">
																			{$t('pricing.activePlans.startFee')}:
																		</span>
																		<div class="ml-2 text-right">
																			<div class="font-medium">
																				{pd.pricingSuccess.other.startFee.amount}
																				{getCurrencySymbol(
																					pd.pricingSuccess.other.startFee.currency
																				)}
																			</div>
																		</div>
																	</div>
																{/if}
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
															{isOldSuccessFee
																? $t('pricing.availablePlans.successFeeNotice')
																: $t('pricing.planSelection.paymentInfo')}
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

		<!-- Plan Selection - Only show when no active plans -->
		{#if activePlans.length === 0}
			<PlanSelection
				onPlanSelected={handlePlanSelected}
				onCustomPlanRequested={handleCustomPlanRequested}
				onSubscriptionCreated={refreshActivePlans}
			/>
		{/if}

		<!-- Invoices Section - Always at the bottom -->
		{#if invoices.length > 0}
			<div class="mb-8 sm:mb-12">
				<h2 class="mb-4 px-2 text-xl font-semibold text-foreground sm:mb-6 sm:px-0 sm:text-2xl">
					{$t('pricing.invoices.title') || 'Invoices'}
				</h2>
				<div class="overflow-hidden rounded-xl border border-border/50 bg-white">
					<div
						class="hidden grid-cols-12 gap-4 border-b px-4 py-3 text-xs font-medium text-muted-foreground sm:grid"
					>
						<div class="col-span-4">{$t('pricing.invoices.number') || 'Invoice'}</div>
						<div class="col-span-3">{$t('pricing.invoices.status') || 'Status'}</div>
						<div class="col-span-3">{$t('pricing.invoices.amount') || 'Amount'}</div>
						<div class="col-span-2 text-right">{$t('pricing.invoices.actions') || 'Actions'}</div>
					</div>

					<div class="divide-y">
						{#each invoices as inv}
							<div class="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-12 sm:items-center">
								<div class="sm:col-span-4">
									<div class="text-sm font-medium">{inv.number || inv.id}</div>
									<div class="text-xs text-muted-foreground">
										{new Date(inv.created * 1000).toLocaleDateString()}
									</div>
								</div>
								<div class="sm:col-span-3">
									<div class="inline-flex rounded-md border px-2 py-0.5 text-xs capitalize">
										{inv.status}
									</div>
								</div>

								<div class="text-sm sm:col-span-3">
									{((inv.amountPaid ?? 0) / 100).toFixed(2)}
									{inv.currency?.toUpperCase()}
								</div>

								<div class="sm:col-span-2 sm:text-right">
									<div class="flex gap-2 sm:justify-end">
										{#if inv.invoicePdf}
											<a
												href={inv.invoicePdf}
												target="_blank"
												rel="noreferrer"
												class="text-xs underline"
											>
												{$t('pricing.invoices.downloadPdf') || 'Download PDF'}
											</a>
										{/if}
										{#if inv.hostedInvoiceUrl}
											<a
												href={inv.hostedInvoiceUrl}
												target="_blank"
												rel="noreferrer"
												class="text-xs underline"
											>
												{$t('pricing.invoices.viewOnline') || 'View online'}
											</a>
										{/if}
									</div>
								</div>
							</div>
						{/each}
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
