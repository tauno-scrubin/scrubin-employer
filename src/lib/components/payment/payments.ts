import { PUBLIC_STRIPE_PUBLIC_KEY, PUBLIC_STRIPE_PUBLIC_KEY_DEV } from '$env/static/public';
import { loadStripe } from '@stripe/stripe-js';
import { currentUser, scrubinClient } from '@/scrubinClient/client';
import { get } from 'svelte/store';

/**
 * Pricing-row amounts (pricingHunt.amount, success fees, …) are stored in cents.
 * Use this to render them as a major-unit price string in the UI.
 */
export function formatPriceAmount(amountInCents: number): string {
	return (amountInCents / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

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
			return 'payment.status.active';
		case 'AWAITING_PAYMENT':
			return 'payment.status.awaitingPayment';
		case 'PENDING':
			return 'payment.status.pending';
		case 'PAUSED':
			return 'payment.status.paused';
		case 'COMPLETED':
			return 'payment.status.completed';
		case 'CANCELLED':
			return 'payment.status.cancelled';
		default:
			return status.toLowerCase();
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

/**
 * Confirms a Stripe PaymentIntent client secret using the card already on file —
 * used for the hunt_subscription activation SCA step (the per-hunt monthly
 * subscription returned requires_action). Throws on failure.
 */
export async function confirmCardPayment(clientSecret: string) {
	const isDemoUser = get(currentUser)?.isDemoUser || false;
	const stripePublicKey = isDemoUser ? PUBLIC_STRIPE_PUBLIC_KEY_DEV : PUBLIC_STRIPE_PUBLIC_KEY;
	const stripe = await loadStripe(stripePublicKey);
	if (!stripe) {
		throw new Error('Payment system failed to initialize');
	}

	const result = await stripe.confirmCardPayment(clientSecret);
	if (result.error && result.error.payment_intent?.status !== 'succeeded') {
		throw new Error(result.error.message || 'Payment failed');
	}
}

export async function payWithStripe(huntId: number, paymentMethodId: string) {
	await scrubinClient.company.updateBillingStripe({
		stripePaymentMethodId: paymentMethodId
	});

	const intent = await scrubinClient.hunt.createPaymentIntent(huntId);

	// Off-session charge already cleared (verified card, no 3DS).
	if (intent.status === 'succeeded') {
		await scrubinClient.hunt.activateHunt(huntId, intent.paymentIntentId, paymentMethodId);
		return { success: true, hunt: huntId };
	}

	// Off-session 3DS challenge — backend has emailed a confirmation link to the user.
	if (intent.status === 'requires_action') {
		return { success: false, hunt: huntId, requiresAction: true };
	}

	// requires_confirmation (legacy on-session path) or undefined status (older backend).
	if (!intent.clientSecret) {
		throw new Error('Payment confirmation required but no client secret returned');
	}

	const isDemoUser = get(currentUser)?.isDemoUser || false;
	const stripePublicKey = isDemoUser ? PUBLIC_STRIPE_PUBLIC_KEY_DEV : PUBLIC_STRIPE_PUBLIC_KEY;
	const stripe = await loadStripe(stripePublicKey);
	if (!stripe) {
		throw new Error('Payment system failed to initialize');
	}

	const result = await stripe.confirmCardPayment(intent.clientSecret);

	if (result.paymentIntent?.status === 'succeeded') {
		await scrubinClient.hunt.activateHunt(huntId, intent.paymentIntentId, paymentMethodId);
		return { success: true, hunt: huntId };
	}

	if (result.error) {
		if (result.error.payment_intent?.status === 'succeeded') {
			return { success: true, hunt: huntId };
		}
		throw new Error(result.error.message || 'Payment failed');
	}

	if (!result.paymentIntent) {
		throw new Error('Payment failed - no payment intent returned');
	}

	return { success: true, hunt: huntId };
}
