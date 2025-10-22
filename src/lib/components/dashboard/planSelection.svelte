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
	import { t } from '$lib/i18n';
	import { scrubinClient } from '@/scrubinClient/client.js';
	import type {
		AvailablePlansResponse,
		AvailablePlan,
		CreateSubscriptionRequest
	} from '@/scrubinClient/index.js';
	import {
		CheckCircle,
		Sparkles,
		Stethoscope,
		Users,
		CreditCard,
		FileText,
		AlertCircle
	} from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	// Props
	interface Props {
		onPlanSelected?: (plan: AvailablePlan) => void;
		onCustomPlanRequested?: () => void;
		onSubscriptionCreated?: () => void;
	}

	let { onPlanSelected, onCustomPlanRequested, onSubscriptionCreated }: Props = $props();

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

	// Plan names mapping based on baseFee amount
	const getPlanName = (plan: AvailablePlan): string => {
		if (plan.baseFee.amount === 0) return $t('pricing.planSelection.planNames.riskFreeStarter');
		if (plan.baseFee.amount <= 200) return $t('pricing.planSelection.planNames.smartPlan');
		return $t('pricing.planSelection.planNames.superPlan');
	};

	const getPlanDescription = (plan: AvailablePlan): string => {
		if (plan.baseFee.amount === 0) {
			return $t('pricing.planSelection.planDescriptions.riskFreeStarter');
		}
		if (plan.baseFee.amount <= 200) {
			return $t('pricing.planSelection.planDescriptions.smartPlan');
		}
		return $t('pricing.planSelection.planDescriptions.superPlan');
	};

	// Simple recommendation logic - just one recommended plan
	const isRecommendedPlan = (plan: AvailablePlan): boolean => {
		return plan.baseFee.amount <= 200 && plan.baseFee.amount > 0; // Smart Plan is recommended
	};

	// Fetch available plans
	const fetchPlans = async () => {
		try {
			isLoading = true;
			error = null;

			const response = await scrubinClient.company.getAvailablePlansV2();
			availablePlans = response.plans.sort((a, b) => a.baseFee.amount - b.baseFee.amount);
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
			toast.error('Plan not available for subscription');
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
				window.location.href = response.checkoutUrl;
			} else if (selectedPaymentMethod === 'invoice') {
				// For invoice payments, trigger parent component to refresh active plans
				onSubscriptionCreated?.();
				toast.success('Subscription created successfully!');
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
		onCustomPlanRequested?.();
	};

	// Initialize
	$effect(() => {
		fetchPlans();
	});
</script>

<div class="mx-auto w-full max-w-screen-xl space-y-8 pb-12">
	{#if isLoading}
		<div class="flex items-center justify-center py-12">
			<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
		</div>
	{:else if error}
		<div
			class="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive"
		>
			{error}
		</div>
	{:else}
		<!-- Plans Grid -->
		<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
			{#each availablePlans as plan}
				{@const planName = getPlanName(plan)}
				{@const planDescription = getPlanDescription(plan)}
				{@const isRecommended = isRecommendedPlan(plan)}

				<div class="relative">
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
						class="relative overflow-hidden transition-all hover:shadow-lg {isRecommended
							? 'ring-1 ring-blue-500 ring-opacity-50'
							: ''}"
					>
						<CardHeader class="pb-4">
							<div class="flex items-center justify-between">
								<CardTitle class="text-xl">{planName}</CardTitle>
								{#if plan.baseFee.amount > 0}
									<div class="text-right">
										<div class="text-2xl font-bold">
											{plan.baseFee.amount}
											{getCurrencySymbol(plan.baseFee.currency)}
											{#if plan.baseFee.vatAmount && plan.baseFee.vatAmount > 0}
												<span class="text-xs font-normal text-muted-foreground">(+VAT)</span>
											{/if}
										</div>
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

						<CardContent class="space-y-6">
							<!-- Success Fees -->
							<div class="space-y-4">
								<div class="flex items-center gap-2">
									<Stethoscope class="h-4 w-4 text-primary" />
									<span class="text-sm font-medium">{$t('pricing.planSelection.doctors')}</span>
								</div>
								<div class="space-y-2 text-sm">
									<div class="flex justify-between">
										<span class="text-muted-foreground"
											>{$t('pricing.planSelection.successFee')}:</span
										>
										<span class="font-medium">
											{plan.successFeeDoctor.amount}
											{getCurrencySymbol(plan.successFeeDoctor.currency)}
											{#if plan.successFeeDoctor.vatAmount && plan.successFeeDoctor.vatAmount > 0}
												<span class="text-xs font-normal text-muted-foreground">(+VAT)</span>
											{/if}
										</span>
									</div>
								</div>
							</div>

							<div class="space-y-4">
								<div class="flex items-center gap-2">
									<Users class="h-4 w-4 text-primary" />
									<span class="text-sm font-medium"
										>{$t('pricing.planSelection.otherProfessionals')}</span
									>
								</div>
								<div class="space-y-2 text-sm">
									<div class="flex justify-between">
										<span class="text-muted-foreground"
											>{$t('pricing.planSelection.successFee')}:</span
										>
										<span class="font-medium">
											{plan.successFeeOther.amount}
											{getCurrencySymbol(plan.successFeeOther.currency)}
											{#if plan.successFeeOther.vatAmount && plan.successFeeOther.vatAmount > 0}
												<span class="text-xs font-normal text-muted-foreground">(+VAT)</span>
											{/if}
										</span>
									</div>
								</div>
							</div>

							<!-- Payment Information -->
							<div class="rounded-md bg-muted/50 p-3">
								<div class="flex items-center gap-2 text-xs text-muted-foreground">
									<CheckCircle class="h-3 w-3" />
									<span>{$t('pricing.planSelection.paymentInfo')}</span>
								</div>
							</div>
						</CardContent>

						<CardFooter class="pt-0">
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
						</CardFooter>
					</Card>
				</div>
			{/each}
		</div>

		<!-- Custom Plan Option -->
		<div class="mt-12 space-y-6">
			<div class="h-px bg-border"></div>
			<div class="rounded-lg border border-border bg-muted/30 p-6">
				<div class="space-y-3">
					<div class="flex items-center gap-2">
						<Sparkles class="h-5 w-5 text-primary" />
						<h3 class="text-xl font-semibold">
							{$t('pricing.planSelection.customTitle')}
						</h3>
					</div>
					<p class="text-base text-muted-foreground">
						{$t('pricing.planSelection.customDescription')}
					</p>
					<Button variant="outline" onclick={handleCustomPlan} class="mt-4 w-full sm:w-auto">
						<Sparkles class="mr-2 h-4 w-4" />
						{$t('pricing.planSelection.requestCustom')}
					</Button>
				</div>
			</div>
		</div>

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
					</div>
				</div>

				<!-- Payment Method Selection -->
				{#if paymentMethods.length > 0}
					<div class="mt-4 space-y-3">
						<div class="text-sm font-medium">Payment Method</div>
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
