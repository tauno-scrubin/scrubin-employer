import { page } from "$app/state";
import { PUBLIC_STRIPE_PUBLIC_KEY } from "$env/static/public";
import { dev } from "$app/environment";
import { loadStripe } from "@stripe/stripe-js";
import { scrubinClient } from "@/scrubinClient/client";

export function formatStatus(status: string) {
    switch (status) {
        case 'ACTIVE':
            return 'Active';
        case 'AWAITING_PAYMENT':
            return 'Ready to Activate';
        case 'PAUSED':
            return 'Paused';
        case 'COMPLETED':
            return 'Completed';
        case 'CANCELLED':
            return 'Cancelled';
    }
}

export function getStatusColor(status: string) {
    // ACTIVE, AWAITING_PAYMENT, PAUSED, COMPLETED, CANCELLED
    switch (status) {
        case 'ACTIVE':
            return 'bg-green-100 text-green-800';
        case 'AWAITING_PAYMENT':
            return 'bg-yellow-100 text-yellow-800';
        case 'PAUSED':
            return 'bg-red-100 text-red-800';
        case 'COMPLETED':
            return 'bg-blue-100 text-blue-800';
        case 'CANCELLED':
            return 'bg-gray-100 text-gray-800';
    }
}

export async function payWithStripe(huntId: number, paymentMethodId: string) {
    // Create PaymentIntent
    const response = await scrubinClient.company.updateBillingStripe({
        stripePaymentMethodId: paymentMethodId
    });

    const createPaymentIntent = await scrubinClient.hunt.createPaymentIntent(huntId);

    const stripePublicKey = PUBLIC_STRIPE_PUBLIC_KEY;
    const stripe = await loadStripe(stripePublicKey);
    if (!stripe) {
        throw new Error('Payment system failed to initialize');
    }

    // Confirm the payment
    const { paymentIntent, error: confirmError } = await stripe.confirmCardPayment(
        createPaymentIntent.clientSecret
    );

    if (confirmError) {
        const errorMessage = confirmError.message;
        throw new Error(errorMessage);
    }

    // Create order
    const activateHunt = await scrubinClient.hunt.activateHunt(huntId, paymentIntent.id, paymentMethodId);

   return {success: true, hunt: activateHunt};
}

