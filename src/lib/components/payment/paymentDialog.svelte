<script lang="ts">
	import Button from "@/components/ui/button/button.svelte";
	import { Loader2, ShieldCheckIcon } from "lucide-svelte";
	import StripeFields from "./stripeFields.svelte";
	import { payWithStripe } from "./payments";
	import { toast } from "svelte-sonner";


    let {
        huntId,
        amount,
        statement
    } : {
        huntId: number,
        amount: number,
        statement?: string
    } = $props()

    let stripePaymentFields: StripeFields;
    let paymentProcessing = $state(false);
    let errorMessage = $state('');

    async function initiatePayment() {
        paymentProcessing = true;
        errorMessage = '';
        try {
            const paymentMethod = await stripePaymentFields.createPaymentMethod();
            await payWithStripe(huntId, paymentMethod.id);
        } catch (error) {
            errorMessage = error instanceof Error ? error.message : 'Payment processing failed';
            toast.error(errorMessage);
            console.error('Payment error:', error);
        } finally {
            paymentProcessing = false;
        }
    }


</script>


    <div class="space-y-4 rounded-lg border border-neutral-100 bg-neutral-50 p-6 dark:border-gray-700 dark:bg-gray-800 mt-5">
        <StripeFields bind:this={stripePaymentFields} />
		<div class="space-y-2">
			<dl class="flex items-center justify-between gap-4">
				<dt class="text-sm font-normal text-gray-500 dark:text-gray-400">
					{statement || 'Starting fee'}
				</dt>
				<dd class="text-sm font-medium text-gray-900 dark:text-white">
                    {amount} €
				</dd>
			</dl>
		</div>

		<dl
			class="flex items-center justify-between gap-4 border-t border-gray-200 pt-2 dark:border-gray-700"
		>
			<dt class="text-sm font-semibold text-gray-900 dark:text-white">Total</dt>
			<dd class="text-sm font-bold text-gray-900 dark:text-white">
                {amount} €
			</dd>
		</dl>
	</div>

    {#if errorMessage}
    <div class="bg-red-50 border border-red-200 rounded-md p-2 text-red-500 text-sm mt-2">{errorMessage}</div>
    {/if}

	<Button class="w-full mt-2" onclick={() => initiatePayment()}>
		<ShieldCheckIcon class="w-4 h-4 mr-2 {paymentProcessing ? 'hidden' : ''}" />
		<Loader2 class="w-4 h-4 animate-spin mr-2 {paymentProcessing ? '' : 'hidden'}" />
		Pay
	</Button>