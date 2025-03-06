<script lang="ts">
	import Button from "@/components/ui/button/button.svelte";
	import { CreditCard, Loader2, ShieldCheckIcon } from "lucide-svelte";
	import StripeFields from "./stripeFields.svelte";
	import { payWithStripe } from "./payments";
	import { toast } from "svelte-sonner";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
	import { onMount } from "svelte";
	import { scrubinClient } from "@/scrubinClient/client";
	import type { CompanyBilling } from "@/scrubinClient";



    let {
        huntId,
        amount,
        currency,
        open = $bindable(false),
        statement,
        onSuccess
    } : {
        huntId: number,
        amount: number,
        currency: string,
        open?: boolean,
        statement?: string,
        onSuccess: (huntId: number) => void
    } = $props()

    let stripePaymentFields: StripeFields;
    let paymentProcessing = $state(false);
    let errorMessage = $state('');
    let existingBilling: CompanyBilling | null = $state(null);
    let loading = $state(false);
    let useNewCard = $state(true);

    $effect(() => {
        if (open) {
            loading = true;
            scrubinClient.company.getBilling().then(billing => {
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
            let paymentMethodId = existingBilling?.stripePaymentMethodId || "";
            if (useNewCard || !paymentMethodId) {
                const paymentMethod = await stripePaymentFields.createPaymentMethod();
                paymentMethodId = paymentMethod.id;
            }
            const result = await payWithStripe(huntId, paymentMethodId);
            onSuccess(huntId);
        } catch (error) {
            errorMessage = error instanceof Error ? error.message : 'Payment processing failed';
            toast.error(errorMessage);
            console.error('Payment error:', error);
        } finally {
            paymentProcessing = false;
            open = false;
        }
    }

    function getCurrencySymbol(currency: string) {
        if (currency === 'AUD') {
            return '$';
        } else if (currency === 'GBP') {
            return '£';
        } 
            return '€';
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
    <div class="space-y-4 rounded-lg border border-neutral-100 bg-neutral-50 p-6 dark:border-gray-700 dark:bg-gray-800 mt-5">
        {#if loading}
        <div class="h-52 w-full bg-neutral-200 rounded-lg animate-pulse"></div>
        {:else}
        {#if existingBilling && existingBilling?.stripePaymentMethod && existingBilling?.stripePaymentMethod?.brand && !useNewCard}
						<div class=" border rounded-lg p-4 bg-card shadow-sm">
							<div class="flex items-center justify-between mb-3">
								<h3 class="text-lg font-medium">Existing Payment Method</h3>
							</div>
							<div class="flex items-center space-x-4">
								<div class="bg-muted p-2 rounded-md flex items-center justify-center">
									<img 
										src="/cards/{existingBilling.stripePaymentMethod.brand.toLowerCase()}.png" 
										alt="{existingBilling.stripePaymentMethod.brand}" 
										class="w-auto h-6 rounded-sm" 
									/>
								</div>
								<div class="flex-1">
									<p class="text-sm font-medium flex items-center">
										{existingBilling.stripePaymentMethod.brand.toUpperCase()} •••• {existingBilling.stripePaymentMethod.last4Digits}
									</p>
									<p class="text-xs text-muted-foreground">
										Expires {existingBilling.stripePaymentMethod.expirationMonth}/{existingBilling.stripePaymentMethod.expirationYear}
									</p>
								</div>
							</div>
						</div>

                        <Button variant="outline" onclick={() => useNewCard = true}>
                            <CreditCard class="w-4 h-4" />
                            Use New Card</Button>
		{/if}


        {#if useNewCard}
        <Button class="{existingBilling && existingBilling?.stripePaymentMethodId ? '' : 'hidden'}" variant="outline" onclick={() => useNewCard = false}>
            <CreditCard class="w-4 h-4" />
            Use Existing Card</Button>

        <StripeFields bind:this={stripePaymentFields} />

        {/if}
		<div class="space-y-2">
			<dl class="flex items-center justify-between gap-4">
				<dt class="text-sm font-normal text-gray-500 dark:text-gray-400">
					{statement || 'Starting fee'}
				</dt>
				<dd class="text-sm font-medium text-gray-900 dark:text-white">
                    {amount} {getCurrencySymbol(currency)}
				</dd>
			</dl>
		</div>

		<dl
			class="flex items-center justify-between gap-4 border-t border-gray-200 pt-2 dark:border-gray-700"
		>
			<dt class="text-sm font-semibold text-gray-900 dark:text-white">Total</dt>
			<dd class="text-sm font-bold text-gray-900 dark:text-white">
                {amount} {getCurrencySymbol(currency)}
			</dd>
		</dl>
        {/if}
	</div>
   

    {#if errorMessage}
    <div class="bg-red-50 border border-red-200 rounded-md p-2 text-red-500 text-sm mt-2">{errorMessage}</div>
    {/if}
   
	<Button class="w-full mt-2" onclick={() => initiatePayment()}>
		<ShieldCheckIcon class="w-4 h-4 mr-2 {paymentProcessing ? 'hidden' : ''}" />
		<Loader2 class="w-4 h-4 animate-spin mr-2 {paymentProcessing ? '' : 'hidden'}" />
		Pay
	</Button>

    </Dialog.Content>
  </Dialog.Root>