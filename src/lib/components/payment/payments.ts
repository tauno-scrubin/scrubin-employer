import { page } from "$app/state";
import { PUBLIC_STRIPE_PUBLIC_KEY, PUBLIC_STRIPE_PUBLIC_KEY_DEV } from "$env/static/public";
import { dev } from "$app/environment";
import { loadStripe } from "@stripe/stripe-js";
import { currentUser, scrubinClient } from "@/scrubinClient/client";
import { get } from "svelte/store";
export function getCurrencySymbol(currency: string) {
    if (currency === 'AUD') {
        return '$A';
    } else if (currency === 'GBP') {
        return '£';
    } 
        return '€';
}

export function formatStatus(status: string) {
    switch (status) {
        case 'ACTIVE':
            return 'Active';
        case 'AWAITING_PAYMENT':
            return 'Ready to Activate';
        case 'PENDING':
            return 'Pending';
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
        case 'PENDING':
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

    const isDemoUser = get(currentUser)?.isDemoUser || false;
    const stripePublicKey = isDemoUser ? PUBLIC_STRIPE_PUBLIC_KEY_DEV : PUBLIC_STRIPE_PUBLIC_KEY;
    const stripe = await loadStripe(stripePublicKey);
    if (!stripe) {
        throw new Error('Payment system failed to initialize');
    }
    // Confirm the payment

    const result = await stripe.confirmCardPayment(
        createPaymentIntent.clientSecret
    );

    console.log('Stripe response:', result); // For debugging

    // Check if payment is already succeeded
    if (result.paymentIntent?.status === 'succeeded') {
        await scrubinClient.hunt.activateHunt(huntId, createPaymentIntent.paymentIntentId, paymentMethodId);
        return { success: true, hunt: huntId };
    }

    // If we have an error, throw it
    if (result.error) {
        // Check if it's the "already succeeded" error
        if (result.error.payment_intent?.status === 'succeeded') {
            return { success: true, hunt: huntId };
        }
        throw new Error(result.error.message || 'Payment failed');
    }

    // If we get here without a PaymentIntent, something went wrong
    if (!result.paymentIntent) {
        throw new Error('Payment failed - no payment intent returned');
    }

    return { success: true, hunt: huntId };
}

