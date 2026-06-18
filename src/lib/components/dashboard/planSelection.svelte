<script lang="ts">
	import { PUBLIC_STRIPE_PUBLIC_KEY, PUBLIC_STRIPE_PUBLIC_KEY_DEV } from '$env/static/public';
	import { loadStripe } from '@stripe/stripe-js';
	import { currentUser } from '@/scrubinClient/client';
	import { get } from 'svelte/store';
	import { getCurrencySymbol, formatPriceAmount } from '$lib/components/payment/payments';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { t } from '$lib/i18n';
	import { scrubinClient } from '@/scrubinClient/client.js';
	import { ApiError } from '@/scrubinClient/index.js';
	import type { AvailablePlanV3, CreateSubscriptionRequest } from '@/scrubinClient/index.js';
	import {
		BadgeCheck,
		CheckCircle,
		CreditCard,
		FileText,
		Info,
		Loader2,
		Sparkles,
		Stethoscope,
		Users
	} from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import CardManagement from '$lib/components/billing/cardManagement.svelte';

	interface Props {
		onSubscriptionCreated?: () => void;
	}

	let { onSubscriptionCreated }: Props = $props();

	type PlanCard =
		| { kind: 'fixed'; plan: AvailablePlanV3 }
		| { kind: 'custom'; plan: AvailablePlanV3 }
		| { kind: 'contact' };

	let planCards = $state<PlanCard[]>([]);
	let isLoading = $state(true);
	let error: string | null = $state(null);
	let isCreatingSubscription = $state(false);

	// Fixed-plan confirmation dialog state
	let fixedDialogOpen = $state(false);
	let fixedPlanToSubscribe: AvailablePlanV3 | null = $state(null);
	let selectedCardId = $state<string>('');
	let fixedTermsAccepted = $state(false);

	// Custom-plan activation dialog state
	let customDialogOpen = $state(false);
	let customPlanToSubscribe: AvailablePlanV3 | null = $state(null);
	let customTermsAccepted = $state(false);

	// Enterprise contact dialog state
	let contactDialogOpen = $state(false);
	let contactMessage = $state('');
	let isSendingMessage = $state(false);

	const fetchPlans = async () => {
		try {
			isLoading = true;
			error = null;

			const response = await scrubinClient.company.getAvailablePlansV3();

			const cards: PlanCard[] = [];
			const fixedPlan = response.plans.find(
				(plan) => plan.planType === 'hunt_subscription' && plan.huntSubscription && !plan.isCustom
			);
			if (fixedPlan) {
				cards.push({ kind: 'fixed', plan: fixedPlan });
			}
			const customPlan = response.plans.find((plan) => plan.isCustom);
			if (customPlan) {
				cards.push({ kind: 'custom', plan: customPlan });
			}
			// The enterprise "Contact us" card is always available, even with no plans at all.
			cards.push({ kind: 'contact' });
			planCards = cards;
		} catch (err) {
			error = (err as Error).message;
			console.error('Failed to fetch available plans:', err);
		} finally {
			isLoading = false;
		}
	};

	const termsFields = (): Pick<
		CreateSubscriptionRequest,
		'termsUrl' | 'privacyPolicyUrl' | 'termsOfServiceUrl' | 'acceptanceDate'
	> => ({
		termsUrl: $t('pricing.planSelection.hiringTermsUrl'),
		privacyPolicyUrl: $t('pricing.planSelection.privacyPolicyUrl'),
		termsOfServiceUrl: $t('pricing.planSelection.termsOfServiceUrl'),
		acceptanceDate: new Date().toISOString()
	});

	const handleSubscribeError = (err: unknown) => {
		if (err instanceof ApiError && err.status === 409) {
			toast.error($t('pricing.planSelection.toast.planAlreadyActive'));
			return;
		}
		const errorMessage = err instanceof Error ? err.message : 'Failed to create subscription';
		toast.error(errorMessage);
		console.error('Subscription creation failed:', err);
	};

	const openFixedDialog = (plan: AvailablePlanV3) => {
		fixedPlanToSubscribe = plan;
		selectedCardId = '';
		fixedTermsAccepted = false;
		fixedDialogOpen = true;
	};

	const confirmFixedSubscription = async () => {
		if (!fixedPlanToSubscribe) return;

		if (!selectedCardId) {
			toast.error($t('pricing.planSelection.toast.selectCard'));
			return;
		}

		try {
			isCreatingSubscription = true;
			fixedDialogOpen = false;

			const subscriptionData: CreateSubscriptionRequest = {
				planId: fixedPlanToSubscribe.planId,
				paymentMethod: 'card',
				stripePaymentMethodId: selectedCardId,
				...termsFields()
			};

			const response = await scrubinClient.company.createSubscription(subscriptionData);

			if (response.status === 'requires_payment' && response.checkoutUrl) {
				// Backend wants the user to capture/verify a card via Stripe Checkout (setup mode)
				const currentUrl = new URL(window.location.href);
				const successUrl = `${currentUrl.origin}/dashboard/pricing?subscription=success`;
				const cancelUrl = `${currentUrl.origin}/dashboard/pricing?subscription=cancelled`;
				const checkoutUrl = new URL(response.checkoutUrl);
				checkoutUrl.searchParams.set('success_url', successUrl);
				checkoutUrl.searchParams.set('cancel_url', cancelUrl);
				window.location.href = checkoutUrl.toString();
				return;
			}

			// First-invoice SCA — payment that requires 3DS confirmation.
			if (response.clientSecret) {
				const isDemoUser = get(currentUser)?.isDemoUser || false;
				const stripePublicKey = isDemoUser
					? PUBLIC_STRIPE_PUBLIC_KEY_DEV
					: PUBLIC_STRIPE_PUBLIC_KEY;
				const stripe = await loadStripe(stripePublicKey);
				if (!stripe) {
					throw new Error('Payment system failed to initialize');
				}

				const result = await stripe.confirmCardPayment(response.clientSecret);

				if (result.error) {
					if (result.error.payment_intent?.status === 'succeeded') {
						onSubscriptionCreated?.();
						toast.success($t('pricing.planSelection.toast.subscriptionCreated'));
						return;
					}
					throw new Error(result.error.message || 'Payment confirmation failed');
				}

				if (result.paymentIntent?.status !== 'succeeded') {
					throw new Error('Payment was not completed');
				}

				onSubscriptionCreated?.();
				toast.success($t('pricing.planSelection.toast.subscriptionCreated'));
				return;
			}

			// 'active' | 'trialing' | other in-app completion paths
			onSubscriptionCreated?.();
			toast.success($t('pricing.planSelection.toast.subscriptionCreated'));
		} catch (err) {
			handleSubscribeError(err);
		} finally {
			isCreatingSubscription = false;
			fixedPlanToSubscribe = null;
		}
	};

	const cancelFixedSubscription = () => {
		fixedDialogOpen = false;
		fixedPlanToSubscribe = null;
		fixedTermsAccepted = false;
	};

	const openCustomDialog = (plan: AvailablePlanV3) => {
		customPlanToSubscribe = plan;
		customTermsAccepted = false;
		customDialogOpen = true;
	};

	const confirmCustomActivation = async () => {
		if (!customPlanToSubscribe) return;

		try {
			isCreatingSubscription = true;
			customDialogOpen = false;

			await scrubinClient.company.createSubscription({
				planId: customPlanToSubscribe.planId,
				paymentMethod: 'invoice',
				...termsFields()
			});

			onSubscriptionCreated?.();
			toast.success($t('pricing.planSelection.toast.customPlanActivated'));
		} catch (err) {
			handleSubscribeError(err);
		} finally {
			isCreatingSubscription = false;
			customPlanToSubscribe = null;
		}
	};

	const cancelCustomActivation = () => {
		customDialogOpen = false;
		customPlanToSubscribe = null;
		customTermsAccepted = false;
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
		<div class="flex flex-col flex-wrap items-stretch justify-center gap-6 sm:flex-row">
			{#each planCards as card}
				<div class="relative flex w-full flex-col sm:max-w-sm">
					{#if card.kind === 'fixed'}
						{@const pricing = card.plan.huntSubscription!}
						<!-- Spacer aligns the card tops (no badge). -->
						<div class="mb-4 h-8"></div>
						<Card
							class="relative flex h-full flex-col overflow-hidden transition-all hover:shadow-lg"
						>
							<CardHeader class="pb-4">
								<CardTitle class="text-xl">{$t('pricing.planSelection.fixed.name')}</CardTitle>
								<div class="flex items-baseline gap-2">
									<span class="text-2xl font-bold">
										{formatPriceAmount(pricing.monthlyFeePerHunt.amount)}
										{getCurrencySymbol(pricing.monthlyFeePerHunt.currency)}
										{#if pricing.monthlyFeePerHunt.vatAmount && pricing.monthlyFeePerHunt.vatAmount > 0}
											<span class="text-xs font-normal text-muted-foreground"
												>(+{$t('pricing.planSelection.vat')})</span
											>
										{/if}
									</span>
									<span class="text-xs text-muted-foreground">
										{$t('pricing.planSelection.fixed.perMonthPerHunt')}
									</span>
								</div>
								<CardDescription class="text-sm">
									{$t('pricing.planSelection.fixed.description')}
								</CardDescription>
							</CardHeader>

							<CardContent class="flex-1 space-y-4">
								<div class="space-y-2">
									<div class="flex items-start gap-2">
										<CheckCircle class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
										<span class="text-sm text-muted-foreground">
											{$t('pricing.planSelection.fixed.bulletPerHunt')}
										</span>
									</div>
									<div class="flex items-start gap-2">
										<CheckCircle class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
										<span class="text-sm text-muted-foreground">
											{$t('pricing.planSelection.fixed.bulletOutreachPace')}
										</span>
									</div>
									<div class="flex items-start gap-2">
										<CheckCircle class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
										<span class="text-sm text-muted-foreground">
											{$t('pricing.planSelection.fixed.bulletVariedCandidates')}
										</span>
									</div>
									<div class="flex items-start gap-2">
										<CheckCircle class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
										<span class="text-sm text-muted-foreground">
											{$t('pricing.planSelection.fixed.bulletNoHiringFees')}
										</span>
									</div>
								</div>

								<div
									class="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3"
								>
									<Info class="h-4 w-4 flex-shrink-0 text-blue-600" />
									<p class="text-xs leading-relaxed text-blue-900">
										{$t('pricing.planSelection.fixed.noChargeToday')}
									</p>
								</div>
							</CardContent>

							<CardFooter class="mt-auto pt-0">
								{#if card.plan.isPlanActive}
									<Button class="w-full" variant="outline" disabled>
										<BadgeCheck class="mr-2 h-4 w-4" />
										{$t('pricing.planSelection.currentPlan')}
									</Button>
								{:else}
									<Button
										class="w-full"
										variant="default"
										onclick={() => openFixedDialog(card.plan)}
										disabled={isCreatingSubscription}
									>
										{#if isCreatingSubscription && fixedPlanToSubscribe === card.plan}
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
					{:else if card.kind === 'custom'}
						{@const enterprise = card.plan.enterprise}
						<!-- "Prepared for you" badge positioned outside and above the card -->
						<div class="mb-4 flex justify-center">
							<span
								class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
							>
								<Sparkles class="h-3 w-3" />
								{$t('pricing.planSelection.customPlan.preparedForYou')}
							</span>
						</div>
						<Card
							class="relative flex h-full flex-col overflow-hidden border-primary/40 transition-all hover:shadow-lg"
						>
							<CardHeader class="pb-4">
								<CardTitle class="text-xl">{$t('pricing.planSelection.customPlan.title')}</CardTitle
								>
								{#if enterprise?.description}
									<CardDescription class="whitespace-pre-line text-sm">
										{enterprise.description}
									</CardDescription>
								{/if}
							</CardHeader>

							<CardContent class="flex-1 space-y-4">
								{#if enterprise?.successFeeDoctor || enterprise?.successFeeOther}
									<div class="space-y-2">
										<h4 class="text-sm font-semibold text-foreground">
											{$t('pricing.planSelection.successFee')}
										</h4>
										{#if enterprise?.successFeeDoctor}
											<div class="flex items-center justify-between">
												<div class="flex items-center gap-2">
													<Stethoscope class="h-4 w-4 text-muted-foreground" />
													<span class="text-sm font-medium text-foreground"
														>{$t('pricing.planSelection.doctors')}</span
													>
												</div>
												<span class="text-sm font-semibold text-foreground">
													{enterprise.successFeeDoctor.amount}
													{getCurrencySymbol(enterprise.successFeeDoctor.currency)}
												</span>
											</div>
										{/if}
										{#if enterprise?.successFeeOther}
											<div class="flex items-center justify-between">
												<div class="flex items-center gap-2">
													<Users class="h-4 w-4 text-muted-foreground" />
													<span class="text-sm font-medium text-foreground"
														>{$t('pricing.planSelection.otherProfessionals')}</span
													>
												</div>
												<span class="text-sm font-semibold text-foreground">
													{enterprise.successFeeOther.amount}
													{getCurrencySymbol(enterprise.successFeeOther.currency)}
												</span>
											</div>
										{/if}
									</div>
								{/if}

								{#if enterprise?.agreementUrl}
									<a
										href={enterprise.agreementUrl}
										target="_blank"
										rel="noopener noreferrer"
										class="inline-flex items-center gap-2 text-sm font-medium text-primary underline hover:text-primary/80"
									>
										<FileText class="h-4 w-4" />
										{$t('pricing.planSelection.customPlan.viewAgreement')}
									</a>
								{/if}

								<div class="flex items-center gap-2 text-xs text-muted-foreground">
									<CheckCircle class="h-3 w-3 flex-shrink-0" />
									<span>{$t('pricing.planSelection.customPlan.manualInvoicing')}</span>
								</div>
							</CardContent>

							<CardFooter class="mt-auto pt-0">
								{#if card.plan.isPlanActive}
									<Button class="w-full" variant="outline" disabled>
										<BadgeCheck class="mr-2 h-4 w-4" />
										{$t('pricing.planSelection.currentPlan')}
									</Button>
								{:else}
									<Button
										class="w-full"
										variant="default"
										onclick={() => openCustomDialog(card.plan)}
										disabled={isCreatingSubscription}
									>
										{#if isCreatingSubscription && customPlanToSubscribe === card.plan}
											<div
												class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"
											></div>
											{$t('pricing.planSelection.customPlan.activating')}
										{:else}
											<Sparkles class="mr-2 h-4 w-4" />
											{$t('pricing.planSelection.customPlan.activate')}
										{/if}
									</Button>
								{/if}
							</CardFooter>
						</Card>
					{:else}
						<!-- Enterprise contact card -->
						<div class="mb-4 h-8"></div>
						<Card
							class="relative flex h-full flex-col overflow-hidden transition-all hover:shadow-lg"
						>
							<CardHeader class="pb-4">
								<div
									class="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between"
								>
									<CardTitle class="text-xl">{$t('pricing.planSelection.enterpriseName')}</CardTitle
									>
									<div class="text-sm font-semibold text-primary">
										{$t('pricing.planSelection.contactUs')}
									</div>
								</div>
								<CardDescription class="text-sm">
									{$t('pricing.planSelection.enterpriseCard.description')}
								</CardDescription>
							</CardHeader>

							<CardContent class="flex-1 space-y-2">
								<div class="flex items-start gap-2">
									<CheckCircle class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
									<span class="text-sm text-muted-foreground">
										{$t('pricing.planSelection.enterpriseCard.successFee')}
									</span>
								</div>
								<div class="flex items-start gap-2">
									<CheckCircle class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
									<span class="text-sm text-muted-foreground">
										{$t('pricing.planSelection.enterpriseCard.fullSpeed')}
									</span>
								</div>
								<div class="flex items-start gap-2">
									<CheckCircle class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
									<span class="text-sm text-muted-foreground">
										{$t('pricing.planSelection.enterpriseCard.unlimitedCandidates')}
									</span>
								</div>
								<div class="flex items-start gap-2">
									<CheckCircle class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
									<span class="text-sm text-muted-foreground">
										{$t('pricing.planSelection.enterpriseCard.customAgreement')}
									</span>
								</div>
							</CardContent>

							<CardFooter class="mt-auto pt-0">
								<Button class="w-full" variant="outline" onclick={() => (contactDialogOpen = true)}>
									<Sparkles class="mr-2 h-4 w-4" />
									{$t('pricing.planSelection.contactUs')}
								</Button>
							</CardFooter>
						</Card>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Fixed-plan Subscription Confirmation Dialog -->
<Dialog.Root bind:open={fixedDialogOpen}>
	<Dialog.Content class="mx-4 flex max-h-[88vh] flex-col sm:mx-auto sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title class="text-base sm:text-lg">
				{$t('pricing.planSelection.confirmTitle')}
			</Dialog.Title>
			<Dialog.Description class="text-sm sm:text-base">
				{#if fixedPlanToSubscribe?.huntSubscription}
					{$t('pricing.planSelection.fixed.confirmDescription', {
						amount: formatPriceAmount(
							fixedPlanToSubscribe.huntSubscription.monthlyFeePerHunt.amount +
								(fixedPlanToSubscribe.huntSubscription.monthlyFeePerHunt.vatAmount || 0)
						),
						currency: getCurrencySymbol(
							fixedPlanToSubscribe.huntSubscription.monthlyFeePerHunt.currency
						)
					})}
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		{#if fixedPlanToSubscribe?.huntSubscription}
			{@const pricing = fixedPlanToSubscribe.huntSubscription}
			<div class="shrink-0 rounded-md bg-muted/50 p-4">
				<div class="mb-2 flex items-center gap-2">
					<Info class="h-4 w-4 text-primary" />
					<span class="text-sm font-medium">{$t('pricing.planSelection.planDetails')}</span>
				</div>
				<div class="space-y-1 text-sm">
					<div class="flex justify-between">
						<span class="text-muted-foreground">{$t('pricing.planSelection.planName')}:</span>
						<span class="font-medium">{$t('pricing.planSelection.fixed.name')}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-muted-foreground"
							>{$t('pricing.planSelection.fixed.monthlyFeePerHunt')}:</span
						>
						<span class="font-medium">
							{formatPriceAmount(pricing.monthlyFeePerHunt.amount)}
							{getCurrencySymbol(pricing.monthlyFeePerHunt.currency)}
							{#if pricing.monthlyFeePerHunt.vatAmount && pricing.monthlyFeePerHunt.vatAmount > 0}
								<span class="text-xs text-muted-foreground">
									(+ {$t('pricing.planSelection.vat')}
									{formatPriceAmount(pricing.monthlyFeePerHunt.vatAmount)}
									{getCurrencySymbol(pricing.monthlyFeePerHunt.currency)})
								</span>
							{/if}
						</span>
					</div>
					<div class="mt-2 space-y-1 border-t border-border pt-2">
						<div class="flex items-center gap-2 text-xs text-muted-foreground">
							<CheckCircle class="h-3 w-3 flex-shrink-0" />
							<span>{$t('pricing.planSelection.fixed.bulletNoHiringFees')}</span>
						</div>
						<div class="flex items-center gap-2 text-xs text-muted-foreground">
							<CheckCircle class="h-3 w-3 flex-shrink-0" />
							<span>{$t('pricing.planSelection.fixed.noChargeToday')}</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Card Selection (payment method is always card for the fixed tier) -->
			<div class="flex min-h-0 flex-1 flex-col gap-2">
				<div class="text-sm font-medium">
					{$t('pricing.planSelection.selectCard') || 'Select Payment Card'}
				</div>
				<div class="min-h-0 flex-1 overflow-y-auto pr-1">
					<CardManagement
						mode="selector"
						bind:selectedCardId
						onCardSelected={(cardId) => {
							selectedCardId = cardId;
						}}
					/>
				</div>
			</div>

			<!-- Hiring Terms Acceptance -->
			<div class="shrink-0 rounded-md border border-border bg-muted/30 p-4">
				<label class="flex cursor-pointer items-start space-x-3">
					<Checkbox bind:checked={fixedTermsAccepted} />
					<span class="text-sm leading-relaxed">
						{$t('pricing.planSelection.acceptTerms')}
						<a
							href={$t('pricing.planSelection.hiringTermsUrl')}
							target="_blank"
							rel="noopener noreferrer"
							class="font-medium text-primary underline hover:text-primary/80"
						>
							{$t('pricing.planSelection.hiringTerms')}
						</a>,
						<a
							href={$t('pricing.planSelection.privacyPolicyUrl')}
							target="_blank"
							rel="noopener noreferrer"
							class="font-medium text-primary underline hover:text-primary/80"
						>
							{$t('pricing.planSelection.privacyPolicy')}
						</a>
						{$t('pricing.planSelection.and')}
						<a
							href={$t('pricing.planSelection.termsOfServiceUrl')}
							target="_blank"
							rel="noopener noreferrer"
							class="font-medium text-primary underline hover:text-primary/80"
						>
							{$t('pricing.planSelection.termsOfService')}
						</a>
					</span>
				</label>
			</div>
		{/if}

		<Dialog.Footer class="flex-col gap-2 sm:flex-row sm:gap-0">
			<Button
				type="button"
				variant="outline"
				onclick={cancelFixedSubscription}
				disabled={isCreatingSubscription}
				class="w-full text-sm sm:w-auto"
			>
				{$t('pricing.planSelection.cancel')}
			</Button>
			<Button
				onclick={confirmFixedSubscription}
				disabled={isCreatingSubscription || !fixedTermsAccepted || !selectedCardId}
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

<!-- Custom-plan Activation Dialog (terms only, no card) -->
<Dialog.Root bind:open={customDialogOpen}>
	<Dialog.Content class="mx-4 sm:mx-auto sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title class="text-base sm:text-lg">
				{$t('pricing.planSelection.customPlan.confirmTitle')}
			</Dialog.Title>
			<Dialog.Description class="text-sm sm:text-base">
				{$t('pricing.planSelection.customPlan.confirmDescription')}
			</Dialog.Description>
		</Dialog.Header>

		{#if customPlanToSubscribe}
			{@const enterprise = customPlanToSubscribe.enterprise}
			<div class="max-h-[60vh] overflow-y-auto py-4">
				<div class="rounded-md bg-muted/50 p-4">
					<div class="mb-2 flex items-center gap-2">
						<Sparkles class="h-4 w-4 text-primary" />
						<span class="text-sm font-medium">{$t('pricing.planSelection.customPlan.title')}</span>
					</div>
					<div class="space-y-2 text-sm">
						{#if enterprise?.description}
							<p class="whitespace-pre-line text-sm leading-relaxed text-foreground/80">
								{enterprise.description}
							</p>
						{/if}
						{#if enterprise?.successFeeDoctor}
							<div class="flex justify-between">
								<span class="text-muted-foreground">{$t('pricing.planSelection.doctors')}:</span>
								<span class="font-medium">
									{enterprise.successFeeDoctor.amount}
									{getCurrencySymbol(enterprise.successFeeDoctor.currency)}
								</span>
							</div>
						{/if}
						{#if enterprise?.successFeeOther}
							<div class="flex justify-between">
								<span class="text-muted-foreground"
									>{$t('pricing.planSelection.otherProfessionals')}:</span
								>
								<span class="font-medium">
									{enterprise.successFeeOther.amount}
									{getCurrencySymbol(enterprise.successFeeOther.currency)}
								</span>
							</div>
						{/if}
						{#if enterprise?.agreementUrl}
							<a
								href={enterprise.agreementUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center gap-2 text-sm font-medium text-primary underline hover:text-primary/80"
							>
								<FileText class="h-4 w-4" />
								{$t('pricing.planSelection.customPlan.viewAgreement')}
							</a>
						{/if}
						<div
							class="flex items-center gap-2 border-t border-border pt-2 text-xs text-muted-foreground"
						>
							<CheckCircle class="h-3 w-3 flex-shrink-0" />
							<span>{$t('pricing.planSelection.customPlan.manualInvoicing')}</span>
						</div>
					</div>
				</div>

				<!-- Hiring Terms Acceptance -->
				<div class="mt-4 rounded-md border border-border bg-muted/30 p-4">
					<label class="flex cursor-pointer items-start space-x-3">
						<Checkbox bind:checked={customTermsAccepted} />
						<span class="text-sm leading-relaxed">
							{$t('pricing.planSelection.acceptTerms')}
							<a
								href={$t('pricing.planSelection.hiringTermsUrl')}
								target="_blank"
								rel="noopener noreferrer"
								class="font-medium text-primary underline hover:text-primary/80"
							>
								{$t('pricing.planSelection.hiringTerms')}
							</a>,
							<a
								href={$t('pricing.planSelection.privacyPolicyUrl')}
								target="_blank"
								rel="noopener noreferrer"
								class="font-medium text-primary underline hover:text-primary/80"
							>
								{$t('pricing.planSelection.privacyPolicy')}
							</a>
							{$t('pricing.planSelection.and')}
							<a
								href={$t('pricing.planSelection.termsOfServiceUrl')}
								target="_blank"
								rel="noopener noreferrer"
								class="font-medium text-primary underline hover:text-primary/80"
							>
								{$t('pricing.planSelection.termsOfService')}
							</a>
						</span>
					</label>
				</div>
			</div>
		{/if}

		<Dialog.Footer class="flex-col gap-2 sm:flex-row sm:gap-0">
			<Button
				type="button"
				variant="outline"
				onclick={cancelCustomActivation}
				disabled={isCreatingSubscription}
				class="w-full text-sm sm:w-auto"
			>
				{$t('pricing.planSelection.cancel')}
			</Button>
			<Button
				onclick={confirmCustomActivation}
				disabled={isCreatingSubscription || !customTermsAccepted}
				class="w-full text-sm sm:w-auto"
			>
				{#if isCreatingSubscription}
					<div
						class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"
					></div>
					{$t('pricing.planSelection.customPlan.activating')}
				{:else}
					<Sparkles class="mr-2 h-4 w-4" />
					{$t('pricing.planSelection.customPlan.activate')}
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
