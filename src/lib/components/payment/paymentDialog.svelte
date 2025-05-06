<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { t } from '$lib/i18n';
	import Button from '@/components/ui/button/button.svelte';
	import type { CompanyBilling } from '@/scrubinClient';
	import { scrubinClient } from '@/scrubinClient/client';
	import { CreditCard, Loader2, ShieldCheckIcon } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { getCurrencySymbol, payWithStripe } from './payments';
	import StripeFields from './stripeFields.svelte';

	let {
		huntId,
		amount,
		vatPercentage,
		vatAmount,
		currency,
		open = $bindable(false),
		statement,
		onSuccess
	}: {
		huntId: number;
		amount: number;
		currency: string;
		vatPercentage?: number;
		vatAmount?: number;
		open?: boolean;
		statement?: string;
		onSuccess: (huntId: number) => void;
	} = $props();

	let stripePaymentFields: StripeFields;
	let paymentProcessing = $state(false);
	let errorMessage = $state('');
	let existingBilling: CompanyBilling | null = $state(null);
	let loading = $state(false);
	let useNewCard = $state(true);

	$effect(() => {
		if (open) {
			loading = true;
			scrubinClient.company.getBilling().then((billing) => {
				existingBilling = billing;
				loading = false;
				if (billing.stripePaymentMethodId) {
					useNewCard = false;
				}
			});
		}
	});

	async function initiatePayment() {
		paymentProcessing = true;
		errorMessage = '';
		try {
			let paymentMethodId = existingBilling?.stripePaymentMethodId || '';
			if (useNewCard || !paymentMethodId) {
				const paymentMethod = await stripePaymentFields.createPaymentMethod();
				paymentMethodId = paymentMethod.id;
			}
			const result = await payWithStripe(huntId, paymentMethodId);
			onSuccess(huntId);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : $t('payment.stripeError');
			toast.error(errorMessage);
			console.error('Payment error:', error);
		} finally {
			paymentProcessing = false;
			open = false;
		}
	}

	// let cards = $state([]);

	// onMount(async () => {
	//     const response = await fetch('/api/stripe/get-customer-cards');
	//     const data = await response.json();
	//     cards = data.cards;

	//     console.log(cards);
	// });
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		<div
			class="mt-5 space-y-4 rounded-lg border border-neutral-100 bg-neutral-50 p-6 dark:border-gray-700 dark:bg-gray-800"
		>
			{#if loading}
				<div class="h-52 w-full animate-pulse rounded-lg bg-neutral-200"></div>
			{:else}
				{#if existingBilling && existingBilling?.stripePaymentMethod && existingBilling?.stripePaymentMethod?.brand && !useNewCard}
					<div class=" rounded-lg border bg-card p-4 shadow-sm">
						<div class="mb-3 flex items-center justify-between">
							<h3 class="text-lg font-medium">{$t('payment.existingPaymentMethod')}</h3>
						</div>
						<div class="flex items-center space-x-4">
							<div class="flex items-center justify-center rounded-md bg-muted p-2">
								<img
									src="/cards/{existingBilling.stripePaymentMethod.brand.toLowerCase()}.png"
									alt={existingBilling.stripePaymentMethod.brand}
									class="h-6 w-auto rounded-sm"
								/>
							</div>
							<div class="flex-1">
								<p class="flex items-center text-sm font-medium">
									{existingBilling.stripePaymentMethod.brand.toUpperCase()} •••• {existingBilling
										.stripePaymentMethod.last4Digits}
								</p>
								<p class="text-xs text-muted-foreground">
									{$t('payment.expires')}
									{existingBilling.stripePaymentMethod.expirationMonth}/{existingBilling
										.stripePaymentMethod.expirationYear}
								</p>
							</div>
						</div>
					</div>

					<Button variant="outline" onclick={() => (useNewCard = true)}>
						<CreditCard class="h-4 w-4" />
						{$t('payment.useNewCard')}</Button
					>
				{/if}

				{#if useNewCard}
					<Button
						class={existingBilling && existingBilling?.stripePaymentMethodId ? '' : 'hidden'}
						variant="outline"
						onclick={() => (useNewCard = false)}
					>
						<CreditCard class="h-4 w-4" />
						{$t('payment.useExistingCard')}</Button
					>

					<StripeFields bind:this={stripePaymentFields} />
				{/if}
				<div class="space-y-2">
					<dl class="flex items-center justify-between gap-4">
						<dt class="text-sm font-normal text-gray-500 dark:text-gray-400">
							{statement || $t('payment.startingFee')}
							{vatAmount && vatPercentage ? $t('payment.net') : ''}
						</dt>
						<dd class="text-sm font-medium text-gray-900 dark:text-white">
							{amount}
							{getCurrencySymbol(currency)}
						</dd>
					</dl>

					{#if vatAmount && vatPercentage}
						<dl class="flex items-center justify-between gap-4">
							<dt class="text-sm font-normal text-gray-500 dark:text-gray-400">
								{$t('payment.vat')} ({vatPercentage}%)
							</dt>
							<dd class="text-sm font-medium text-gray-900 dark:text-white">
								{vatAmount}
								{getCurrencySymbol(currency)}
							</dd>
						</dl>
					{/if}
				</div>

				<dl
					class="flex items-center justify-between gap-4 border-t border-gray-200 pt-2 dark:border-gray-700"
				>
					<dt class="text-sm font-semibold text-gray-900 dark:text-white">{$t('payment.total')}</dt>
					<dd class="text-sm font-bold text-gray-900 dark:text-white">
						{amount + (vatAmount || 0)}
						{getCurrencySymbol(currency)}
					</dd>
				</dl>
			{/if}
		</div>

		{#if errorMessage}
			<div class="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-500">
				{errorMessage}
			</div>
		{/if}

		<Button class="mt-2 w-full" onclick={() => initiatePayment()}>
			<ShieldCheckIcon class="mr-2 h-4 w-4 {paymentProcessing ? 'hidden' : ''}" />
			<Loader2 class="mr-2 h-4 w-4 animate-spin {paymentProcessing ? '' : 'hidden'}" />
			{$t('payment.pay')}
		</Button>
	</Dialog.Content>
</Dialog.Root>
