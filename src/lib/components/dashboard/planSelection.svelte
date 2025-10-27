<script lang="ts">
	import { getCurrencySymbol } from '$lib/components/payment/payments';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { t } from '$lib/i18n';
	import { scrubinClient } from '@/scrubinClient/client.js';
	import type {
		AvailablePlansResponse,
		AvailablePlan,
		CreateSubscriptionRequest,
		Company
	} from '@/scrubinClient/index.js';
	import {
		Sparkles,
		Stethoscope,
		Users,
		CreditCard,
		FileText,
		AlertCircle,
		Calendar,
		CheckCircle,
		Info,
		Receipt,
		Zap,
		Shield,
		Target,
		TrendingUp,
		Loader2
	} from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	// Props
	interface Props {
		onPlanSelected?: (plan: AvailablePlan) => void;
		onCustomPlanRequested?: () => void;
		onSubscriptionCreated?: () => void;
	}

	let { onPlanSelected, onSubscriptionCreated }: Props = $props();

	// State
	let availablePlans = $state<AvailablePlan[]>([]);
	let paymentMethods = $state<string[]>([]);
	let isLoading = $state(true);
	let error: string | null = $state(null);
	let selectedPlan: AvailablePlan | null = $state(null);
	let isCreatingSubscription = $state(false);
	let couponCode = $state('');
	let confirmationDialogOpen = $state(false);
	let planToSubscribe: AvailablePlan | null = $state(null);
	let selectedPaymentMethod = $state<'card' | 'invoice'>('card');
	let companyInfo: Company | null = $state(null);

	// Enterprise contact dialog state
	let contactDialogOpen = $state(false);
	let contactMessage = $state('');
	let isSendingMessage = $state(false);

	// Plan names mapping based on position in sorted plans (exclude custom enterprise)
	const getPlanName = (plan: AvailablePlan): string => {
		if (plan.planId === -1) return $t('pricing.planSelection.enterpriseName');
		const paidPlansSorted = [...availablePlans]
			.filter((p) => p.planId !== -1)
			.sort((a, b) => a.baseFee.amount - b.baseFee.amount);
		const planIndex = paidPlansSorted.findIndex((p) => p.planId === plan.planId);

		if (planIndex === 0) return $t('pricing.planSelection.starterName');
		if (planIndex === 1) return $t('pricing.planSelection.smartName');
		return $t('pricing.planSelection.starterName');
	};

	const getPlanDescription = (plan: AvailablePlan): string => {
		if (plan.planId === -1) return $t('pricing.planSelection.planDescriptionsStatic.enterprise');
		const paidPlansSorted = [...availablePlans]
			.filter((p) => p.planId !== -1)
			.sort((a, b) => a.baseFee.amount - b.baseFee.amount);
		const planIndex = paidPlansSorted.findIndex((p) => p.planId === plan.planId);

		if (planIndex === 0) return $t('pricing.planSelection.planDescriptionsStatic.starter');
		if (planIndex === 1) return $t('pricing.planSelection.planDescriptionsStatic.smart');
		return '';
	};

	const getPaymentTerms = (): { schedule: string; installments: string; tax: string } | null => {
		if (!companyInfo) return null;

		const country = companyInfo.country;
		let countryKey = 'OTHER';

		// Map country to specific key
		if (country === 'Estonia') {
			countryKey = 'EE';
		} else if (country === 'United Kingdom') {
			countryKey = 'UK';
		} else if (country === 'Australia') {
			countryKey = 'AU';
		}

		// Access translation keys individually
		const schedule = $t(`pricing.planSelection.paymentTerms.${countryKey}.paymentSchedule`);
		const installments = $t(`pricing.planSelection.paymentTerms.${countryKey}.installments`);
		const tax = $t(`pricing.planSelection.paymentTerms.${countryKey}.taxInfo`);

		// Check if any translation was found (if not, it returns the key itself)
		if (schedule && !schedule.includes('pricing.planSelection.paymentTerms')) {
			return {
				schedule,
				installments,
				tax
			};
		}
		return null;
	};

	// Recommendation logic - Smart plan (second paid plan) is always recommended
	const isRecommendedPlan = (plan: AvailablePlan): boolean => {
		if (plan.planId === -1) return false;
		const paidPlansSorted = [...availablePlans]
			.filter((p) => p.planId !== -1)
			.sort((a, b) => a.baseFee.amount - b.baseFee.amount);
		const planIndex = paidPlansSorted.findIndex((p) => p.planId === plan.planId);
		return planIndex === 1;
	};

	// Fetch available plans
	const fetchPlans = async () => {
		try {
			isLoading = true;
			error = null;

			const [response, company] = await Promise.all([
				scrubinClient.company.getAvailablePlansV2(),
				scrubinClient.company.getCompany()
			]);
			companyInfo = company;
			let plans = response.plans.sort((a, b) => a.baseFee.amount - b.baseFee.amount);

			// If we only have 2 plans, add a custom enterprise plan (sorted last visually)
			if (plans.length === 2) {
				const enterprisePlan: AvailablePlan = {
					planId: -1, // Use -1 to identify custom enterprise plan
					planType: 'enterprise-custom',
					baseFee: {
						amount: Number.MAX_SAFE_INTEGER, // force to sort last by price
						currency: 'EUR',
						vatAmount: 0
					},
					successFeeDoctor: {
						amount: 0,
						currency: 'EUR',
						vatAmount: 0
					},
					successFeeOther: {
						amount: 0,
						currency: 'EUR',
						vatAmount: 0
					}
				};
				plans = [...plans, enterprisePlan];
			}

			availablePlans = plans;
			paymentMethods = response.paymentMethods;
		} catch (err) {
			error = (err as Error).message;
			console.error('Failed to fetch available plans:', err);
		} finally {
			isLoading = false;
		}
	};

	const handlePlanSelect = (plan: AvailablePlan) => {
		selectedPlan = plan;
		onPlanSelected?.(plan);
	};

	const handleSubscribe = (plan: AvailablePlan) => {
		planToSubscribe = plan;
		// Set default payment method based on available methods
		selectedPaymentMethod = paymentMethods.includes('card')
			? 'card'
			: (paymentMethods[0] as 'card' | 'invoice');
		confirmationDialogOpen = true;
	};

	const confirmSubscription = async () => {
		if (!planToSubscribe?.planId) {
			toast.error($t('pricing.planSelection.toast.planNotAvailable'));
			return;
		}

		try {
			isCreatingSubscription = true;
			confirmationDialogOpen = false;

			const subscriptionData: CreateSubscriptionRequest = {
				planId: planToSubscribe.planId,
				paymentMethod: selectedPaymentMethod,
				couponCode: couponCode.trim() || undefined
			};

			const response = await scrubinClient.company.createSubscription(subscriptionData);

			if (selectedPaymentMethod === 'card' && response.checkoutUrl) {
				// Redirect to Stripe checkout for card payments
				// Add success/cancel URLs to maintain session context
				const currentUrl = new URL(window.location.href);
				const successUrl = `${currentUrl.origin}/dashboard/pricing?subscription=success`;
				const cancelUrl = `${currentUrl.origin}/dashboard/pricing?subscription=cancelled`;

				const checkoutUrl = new URL(response.checkoutUrl);
				checkoutUrl.searchParams.set('success_url', successUrl);
				checkoutUrl.searchParams.set('cancel_url', cancelUrl);

				window.location.href = checkoutUrl.toString();
			} else if (selectedPaymentMethod === 'invoice') {
				// For invoice payments, trigger parent component to refresh active plans
				onSubscriptionCreated?.();
				toast.success($t('pricing.planSelection.toast.subscriptionCreated'));
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to create subscription';
			toast.error(errorMessage);
			console.error('Subscription creation failed:', err);
		} finally {
			isCreatingSubscription = false;
			planToSubscribe = null;
		}
	};

	const cancelSubscription = () => {
		confirmationDialogOpen = false;
		planToSubscribe = null;
	};

	const handleCustomPlan = () => {
		// Keep callback for parent if needed
		// onCustomPlanRequested?.();
		contactDialogOpen = true;
	};

	const sendCustomPlanRequest = async () => {
		if (!contactMessage.trim()) {
			toast.error($t('pricing.planSelection.toast.enterMessage'));
			return;
		}
		try {
			isSendingMessage = true;
			await scrubinClient.company.requestCustomPlan(contactMessage.trim());
			toast.success($t('pricing.planSelection.toast.messageSent'));
			contactMessage = '';
			contactDialogOpen = false;
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : $t('pricing.planSelection.toast.failedToSend');
			toast.error(errorMessage);
			console.error('Custom plan request failed:', err);
		} finally {
			isSendingMessage = false;
		}
	};

	const openCalendarBooking = () => {
		const url = 'https://calendar.app.google/VN4kA74b4Xjn6tHN7';
		window.open(url, '_blank', 'noopener');
	};

	// Initialize
	$effect(() => {
		fetchPlans();
	});
</script>

<div class="mx-auto w-full max-w-screen-xl space-y-8 pb-12">
	{#if isLoading}
		<div class="flex h-40 items-center justify-center">
			<Loader2 class="h-5 w-5 animate-spin text-primary/70" />
		</div>
	{:else if error}
		<div
			class="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive"
		>
			{error}
		</div>
	{:else}
		<!-- Plans Grid -->
		<div class="grid grid-cols-1 items-start gap-6 md:grid-cols-3">
			{#each availablePlans as plan}
				{@const planName = getPlanName(plan)}
				{@const planDescription = getPlanDescription(plan)}
				{@const isRecommended = isRecommendedPlan(plan)}
				{@const paymentTerms = getPaymentTerms()}

				<div class="relative flex h-full flex-col">
					{#if isRecommended}
						<!-- Most Popular badge positioned outside and above the card -->
						<div class="mb-4 flex justify-center">
							<span
								class="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800"
							>
								{$t('pricing.planSelection.mostPopular')}
							</span>
						</div>
					{:else}
						<!-- Empty space to align cards at the same level -->
						<div class="mb-4 h-8"></div>
					{/if}
					<Card
						class="relative flex h-full flex-col overflow-hidden transition-all hover:shadow-lg"
					>
						<CardHeader class="pb-4">
							<div class="flex items-center justify-between">
								<CardTitle class="text-xl">{planName}</CardTitle>
								{#if plan.planId === -1}
									<div class="text-right">
										<div class="text-sm font-semibold text-primary">
											{$t('pricing.planSelection.contactUs')}
										</div>
									</div>
								{:else if plan.baseFee.amount > 0}
									<div class="text-right">
										<Popover.Root>
											<Popover.Trigger>
												<div class="flex cursor-pointer items-center justify-end gap-2">
													<Button variant="ghost" size="sm" class="h-6 w-6 p-0 hover:bg-muted">
														<Info class="h-3 w-3 text-muted-foreground" />
													</Button>
													<div class="text-2xl font-bold">
														{plan.baseFee.amount}
														{getCurrencySymbol(plan.baseFee.currency)}
														{#if plan.baseFee.vatAmount && plan.baseFee.vatAmount > 0}
															<span class="text-xs font-normal text-muted-foreground"
																>(+{$t('pricing.planSelection.vat')})</span
															>
														{/if}
													</div>
												</div>
											</Popover.Trigger>
											<Popover.Content class="w-80">
												<div class="space-y-2">
													<h4 class="text-sm font-medium">
														{$t('pricing.planSelection.monthlyAccountFee')}
													</h4>
													<p class="text-xs text-muted-foreground">
														{$t('pricing.planSelection.monthlyAccountFeeDescription')}
													</p>
												</div>
											</Popover.Content>
										</Popover.Root>
									</div>
								{:else}
									<div class="text-right">
										<div class="text-2xl font-bold text-green-600">
											{$t('pricing.planSelection.free')}
										</div>
									</div>
								{/if}
							</div>
							<CardDescription class="text-sm">
								{planDescription}
							</CardDescription>
						</CardHeader>

						<CardContent class="flex-1 space-y-6">
							<!-- Plan Features -->
							<div class="space-y-3">
								<h4 class="text-sm font-semibold text-foreground">
									{$t('pricing.planSelection.includedFeatures')}
								</h4>
								<div class="space-y-2">
									<div class="flex items-center gap-2">
										<Zap class="h-4 w-4 text-blue-500" />
										<span class="text-sm text-muted-foreground"
											>{$t('pricing.planSelection.features.aiOffers')}</span
										>
									</div>
									<div class="flex items-center gap-2">
										<Target class="h-4 w-4 text-green-500" />
										<span class="text-sm text-muted-foreground"
											>{$t('pricing.planSelection.features.candidateMatching')}</span
										>
									</div>
									<div class="flex items-center gap-2">
										<Shield class="h-4 w-4 text-purple-500" />
										<span class="text-sm text-muted-foreground"
											>{$t('pricing.planSelection.features.verifiedPool')}</span
										>
									</div>
									<div class="flex items-center gap-2">
										<TrendingUp class="h-4 w-4 text-orange-500" />
										<span class="text-sm text-muted-foreground"
											>{$t('pricing.planSelection.features.analytics')}</span
										>
									</div>
								</div>
							</div>

							<!-- Success Fees - Clean Design -->
							<div class="mt-auto space-y-3 border-t border-border pt-4">
								<div class="flex items-center gap-2">
									<CheckCircle class="h-4 w-4 text-primary" />
									<h4 class="text-sm font-semibold text-foreground">
										{$t('pricing.planSelection.successFee')}
									</h4>
								</div>

								<div class="space-y-3">
									<p class="text-xs text-muted-foreground">
										{$t('pricing.planSelection.successFeeDescription')}
									</p>

									<div class="space-y-2">
										{#if plan.planId === -1}
											<!-- Enterprise - Custom pricing -->
											<!-- Doctors Box -->
											<div class="flex items-center justify-between">
												<div class="flex items-center gap-2">
													<Stethoscope class="h-4 w-4 text-blue-500" />
													<span class="text-sm font-medium text-foreground"
														>{$t('pricing.planSelection.doctors')}</span
													>
												</div>
												<span class="text-sm font-semibold text-muted-foreground">
													{$t('pricing.planSelection.custom')}
												</span>
											</div>

											<!-- Nurses Box -->
											<div class="flex items-center justify-between">
												<div class="flex items-center gap-2">
													<Users class="h-4 w-4 text-green-500" />
													<span class="text-sm font-medium text-foreground"
														>{$t('pricing.planSelection.otherProfessionals')}</span
													>
												</div>
												<span class="text-sm font-semibold text-muted-foreground">
													{$t('pricing.planSelection.custom')}
												</span>
											</div>
										{:else}
											<!-- Regular plans - Show actual pricing -->
											<!-- Doctors Box -->
											<div class="flex items-center justify-between">
												<div class="flex items-center gap-2">
													<Stethoscope class="h-4 w-4 text-blue-500" />
													<span class="text-sm font-medium text-foreground"
														>{$t('pricing.planSelection.doctors')}</span
													>
												</div>
												<span class="text-sm font-semibold text-foreground">
													{plan.successFeeDoctor.amount}
													{getCurrencySymbol(plan.successFeeDoctor.currency)}
												</span>
											</div>

											<!-- Nurses Box -->
											<div class="flex items-center justify-between">
												<div class="flex items-center gap-2">
													<Users class="h-4 w-4 text-green-500" />
													<span class="text-sm font-medium text-foreground"
														>{$t('pricing.planSelection.otherProfessionals')}</span
													>
												</div>
												<span class="text-sm font-semibold text-foreground">
													{plan.successFeeOther.amount}
													{getCurrencySymbol(plan.successFeeOther.currency)}
												</span>
											</div>
										{/if}
									</div>
								</div>
							</div>
						</CardContent>

						<CardFooter class="mt-auto pt-0">
							{#if plan.planId === -1}
								<Button class="w-full" variant="outline" onclick={handleCustomPlan}>
									<Sparkles class="mr-2 h-4 w-4" />
									{$t('pricing.planSelection.contactUs')}
								</Button>
							{:else}
								<Button
									class="w-full"
									variant="default"
									onclick={() => handleSubscribe(plan)}
									disabled={isCreatingSubscription}
								>
									{#if isCreatingSubscription && selectedPlan === plan}
										<div
											class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"
										></div>
										{$t('pricing.planSelection.creating')}
									{:else}
										<CreditCard class="mr-2 h-4 w-4" />
										{$t('pricing.planSelection.selectPlan')}
									{/if}
								</Button>
							{/if}
						</CardFooter>
					</Card>
				</div>
			{/each}
		</div>

		<!-- Global Payment Terms Section -->
		{#if getPaymentTerms()}
			{@const paymentTerms = getPaymentTerms()!}
			<div class="w-full space-y-4 rounded-lg border border-border bg-muted/20 p-6">
				<div class="flex items-center gap-2">
					<Info class="h-4 w-4 text-muted-foreground" />
					<h3 class="text-sm font-medium text-muted-foreground">
						{$t('pricing.planSelection.paymentTermsTitle')}
					</h3>
				</div>
				<div class="grid gap-4 md:grid-cols-3">
					{#if paymentTerms.schedule}
						<div class="space-y-2">
							<div class="flex items-center gap-2">
								<Calendar class="h-4 w-4 text-blue-500" />
								<h4 class="text-sm font-medium text-muted-foreground">
									{$t('pricing.planSelection.paymentSchedule')}
								</h4>
							</div>
							<p class="text-sm text-muted-foreground">{paymentTerms.schedule}</p>
						</div>
					{/if}
					{#if paymentTerms.installments}
						<div class="space-y-2">
							<div class="flex items-center gap-2">
								<CreditCard class="h-4 w-4 text-green-500" />
								<h4 class="text-sm font-medium text-muted-foreground">
									{$t('pricing.planSelection.installments')}
								</h4>
							</div>
							<p class="text-sm text-muted-foreground">{paymentTerms.installments}</p>
						</div>
					{/if}
					{#if paymentTerms.tax}
						<div class="space-y-2">
							<div class="flex items-center gap-2">
								<Receipt class="h-4 w-4 text-purple-500" />
								<h4 class="text-sm font-medium text-muted-foreground">
									{$t('pricing.planSelection.taxInfo')}
								</h4>
							</div>
							<p class="text-sm text-muted-foreground">{paymentTerms.tax}</p>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Coupon Code Input -->
		{#if selectedPlan}
			<div class="mx-auto max-w-md space-y-2">
				<label for="coupon" class="text-sm font-medium"
					>{$t('pricing.planSelection.couponLabel')}</label
				>
				<input
					id="coupon"
					type="text"
					bind:value={couponCode}
					placeholder={$t('pricing.planSelection.couponPlaceholder')}
					class="w-full rounded-md border border-input px-3 py-2 text-sm"
				/>
			</div>
		{/if}
	{/if}
</div>

<!-- Subscription Confirmation Dialog -->
<Dialog.Root bind:open={confirmationDialogOpen}>
	<Dialog.Content class="mx-4 sm:mx-auto sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title class="text-base sm:text-lg">
				{$t('pricing.planSelection.confirmTitle')}
			</Dialog.Title>
			<Dialog.Description class="text-sm sm:text-base">
				{#if planToSubscribe?.baseFee?.amount && planToSubscribe.baseFee.amount > 0}
					{$t('pricing.planSelection.confirmDescription', {
						amount: (
							planToSubscribe.baseFee.amount + (planToSubscribe.baseFee.vatAmount || 0)
						).toString(),
						currency: getCurrencySymbol(planToSubscribe.baseFee.currency)
					})}
				{:else}
					{$t('pricing.planSelection.confirmDescriptionFree')}
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		{#if planToSubscribe}
			<div class="py-4">
				<div class="rounded-md bg-muted/50 p-4">
					<div class="mb-2 flex items-center gap-2">
						<AlertCircle class="h-4 w-4 text-primary" />
						<span class="text-sm font-medium">{$t('pricing.planSelection.planDetails')}</span>
					</div>
					<div class="space-y-1 text-sm">
						<div class="flex justify-between">
							<span class="text-muted-foreground">{$t('pricing.planSelection.planName')}:</span>
							<span class="font-medium">{getPlanName(planToSubscribe)}</span>
						</div>
						{#if planToSubscribe.baseFee.amount > 0}
							<div class="flex justify-between">
								<span class="text-muted-foreground">{$t('pricing.planSelection.monthlyFee')}:</span>
								<span class="font-medium">
									{planToSubscribe.baseFee.amount}
									{getCurrencySymbol(planToSubscribe.baseFee.currency)}
									{#if planToSubscribe.baseFee.vatAmount && planToSubscribe.baseFee.vatAmount > 0}
										<span class="text-xs text-muted-foreground">
											(+ VAT {planToSubscribe.baseFee.vatAmount}
											{getCurrencySymbol(planToSubscribe.baseFee.currency)})
										</span>
									{/if}
								</span>
							</div>
						{/if}

						<!-- Divider -->
						<div class="my-3 border-t border-border"></div>

						<!-- Success Fees Section -->
						<div class="space-y-2">
							<div class="mb-2 text-sm font-medium text-muted-foreground">Success Fees</div>
							<div class="flex justify-between">
								<span class="text-muted-foreground">{$t('pricing.planSelection.doctors')}:</span>
								<span class="font-medium">
									{planToSubscribe.successFeeDoctor.amount}
									{getCurrencySymbol(planToSubscribe.successFeeDoctor.currency)}
									{#if planToSubscribe.successFeeDoctor.vatAmount && planToSubscribe.successFeeDoctor.vatAmount > 0}
										<span class="text-xs font-normal text-muted-foreground">(+VAT)</span>
									{/if}
								</span>
							</div>
							<div class="flex justify-between">
								<span class="text-muted-foreground"
									>{$t('pricing.planSelection.otherProfessionals')}:</span
								>
								<span class="font-medium">
									{planToSubscribe.successFeeOther.amount}
									{getCurrencySymbol(planToSubscribe.successFeeOther.currency)}
									{#if planToSubscribe.successFeeOther.vatAmount && planToSubscribe.successFeeOther.vatAmount > 0}
										<span class="text-xs font-normal text-muted-foreground">(+VAT)</span>
									{/if}
								</span>
							</div>
						</div>
						<!-- Payment Information -->
						<div class="mt-3 border-t border-border pt-3">
							<div class="flex items-center gap-2 text-xs text-muted-foreground">
								<CheckCircle class="h-3 w-3" />
								<span>{$t('pricing.planSelection.paymentInfo')}</span>
							</div>
						</div>

						<div class="mt-3 pt-3">
							<div class="flex items-center gap-2 text-xs text-muted-foreground">
								<CheckCircle class="h-3 w-3" />
								<span>{@html $t('pricing.planSelection.terms')}</span>
							</div>
						</div>
					</div>
				</div>

				<!-- Payment Method Selection -->
				{#if paymentMethods.length > 0}
					<div class="mt-4 space-y-3">
						<div class="text-sm font-medium">{$t('pricing.planSelection.paymentMethod')}</div>
						<div class="space-y-2">
							{#each paymentMethods as method}
								<label class="flex cursor-pointer items-center space-x-2">
									<input
										type="radio"
										bind:group={selectedPaymentMethod}
										value={method}
										class="h-4 w-4 text-primary"
									/>
									<span class="text-sm capitalize">{method}</span>
								</label>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<Dialog.Footer class="flex-col gap-2 sm:flex-row sm:gap-0">
			<Button
				type="button"
				variant="outline"
				onclick={cancelSubscription}
				disabled={isCreatingSubscription}
				class="w-full text-sm sm:w-auto"
			>
				{$t('pricing.planSelection.cancel')}
			</Button>
			<Button
				onclick={confirmSubscription}
				disabled={isCreatingSubscription}
				class="w-full text-sm sm:w-auto"
			>
				{#if isCreatingSubscription}
					<div
						class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"
					></div>
					{$t('pricing.planSelection.creating')}
				{:else}
					<CreditCard class="mr-2 h-4 w-4" />
					{$t('pricing.planSelection.confirm')}
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Contact Us Dialog for Enterprise plan -->
<Dialog.Root bind:open={contactDialogOpen}>
	<Dialog.Content class="mx-4 sm:mx-auto sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title class="text-base sm:text-lg"
				>{$t('pricing.planSelection.contactDialog.title')}</Dialog.Title
			>
			<Dialog.Description class="text-sm sm:text-base">
				{$t('pricing.planSelection.contactDialog.description')}
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-2">
			<div class="flex flex-col gap-2 sm:flex-row">
				<Button class="w-full sm:w-auto" variant="outline" onclick={openCalendarBooking}>
					<Sparkles class="mr-2 h-4 w-4" />
					{$t('pricing.planSelection.contactDialog.bookCall')}
				</Button>
			</div>
			<div class="space-y-2">
				<label for="contact-message" class="text-sm font-medium"
					>{$t('pricing.planSelection.contactDialog.sendMessage')}</label
				>
				<textarea
					id="contact-message"
					class="min-h-28 w-full rounded-md border border-input px-3 py-2 text-sm"
					bind:value={contactMessage}
					placeholder={$t('pricing.planSelection.contactDialog.messagePlaceholder')}
				></textarea>
				<div class="flex justify-end">
					<Button onclick={sendCustomPlanRequest} disabled={isSendingMessage}>
						{#if isSendingMessage}
							<div
								class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"
							></div>
							{$t('pricing.planSelection.contactDialog.sending')}
						{:else}
							<FileText class="mr-2 h-4 w-4" />
							{$t('pricing.planSelection.contactDialog.sendMessageButton')}
						{/if}
					</Button>
				</div>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
