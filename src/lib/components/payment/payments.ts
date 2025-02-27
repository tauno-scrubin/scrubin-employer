import { page } from "$app/state";
import { PUBLIC_STRIPE_PUBLIC_KEY } from "$env/static/public";
import { dev } from "$app/environment";
import { loadStripe } from "@stripe/stripe-js";
import { scrubinClient } from "@/scrubinClient/client";


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

   return activateHunt;
}

