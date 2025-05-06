<script lang="ts">
	import { onMount } from 'svelte';
	import { loadStripe } from '@stripe/stripe-js';
	import type {
		Stripe,
		StripeElements,
		StripeCardNumberElement,
		StripeCardExpiryElement,
		StripeCardCvcElement
	} from '@stripe/stripe-js';
	import { PUBLIC_STRIPE_PUBLIC_KEY, PUBLIC_STRIPE_PUBLIC_KEY_DEV } from '$env/static/public';
	import { currentUser } from '@/scrubinClient/client';
	import { get } from 'svelte/store';
	import { t } from '$lib/i18n';

	let stripePublicKey: string = '';

	let stripe: Stripe | null = $state(null);
	let elements: StripeElements | null = $state(null);
	let cardNumberElement: StripeCardNumberElement | null = $state(null);
	let cardExpiryElement: StripeCardExpiryElement | null = $state(null);
	let cardCvcElement: StripeCardCvcElement | null = $state(null);
	let nameInput: HTMLInputElement;
	let error: string | null = $state(null);

	onMount(async () => {
		const isDemoUser = get(currentUser)?.isDemoUser || false;
		stripePublicKey = isDemoUser ? PUBLIC_STRIPE_PUBLIC_KEY_DEV : PUBLIC_STRIPE_PUBLIC_KEY;
		stripe = await loadStripe(stripePublicKey);

		if (stripe) {
			elements = stripe.elements();

			const style = {
				base: {
					fontSize: '14px',
					backgroundColor: '#ffffff',
					color: '#32325d',
					'::placeholder': {
						color: '#aab7c4'
					}
				},
				invalid: {
					color: '#fa755a',
					iconColor: '#fa755a'
				}
			};

			cardNumberElement = elements.create('cardNumber', { style });
			cardExpiryElement = elements.create('cardExpiry', { style });
			cardCvcElement = elements.create('cardCvc', { style });

			cardNumberElement.mount('#card-number-element');
			cardExpiryElement.mount('#card-expiry-element');
			cardCvcElement.mount('#card-cvc-element');
			//createPaymentRequest();
		}
	});

	let prBtn: any;

	export async function createPaymentMethod() {
		if (!stripe || !elements || !cardNumberElement || !cardExpiryElement || !cardCvcElement) {
			throw new Error('Stripe has not been initialized');
		}
		error = null;
		return stripe
			.createPaymentMethod({
				type: 'card',
				card: cardNumberElement,
				billing_details: {
					name: nameInput.value
				}
			})
			.then(({ paymentMethod, error: stripeError }) => {
				if (stripeError) {
					error = stripeError.message || 'An error occurred. Please try again.';
					throw new Error(error);
				}
				return paymentMethod;
			});
	}
</script>

<div class="stripe-payment-fields">
	<div bind:this={prBtn} id="payment-request-button" class="mb-4"></div>
	<div class="mb-4">
		<label for="cardholder-name" class="block text-sm font-medium text-gray-700"
			>{$t('payment.cardholderName')}</label
		>
		<input
			bind:this={nameInput}
			id="cardholder-name"
			type="text"
			required
			class="mt-1 block w-full rounded-md border border-gray-300 px-2 py-2 text-sm shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
		/>
	</div>

	<div class="mb-4">
		<label for="card-number-element" class="block text-sm font-medium text-gray-700"
			>{$t('payment.cardNumber')}</label
		>
		<div id="card-number-element" class="mt-1 rounded-md border bg-white p-2.5 shadow-sm"></div>
	</div>

	<div class="mb-4 grid grid-cols-2 gap-4">
		<div>
			<label for="card-expiry-element" class="block text-sm font-medium text-gray-700"
				>{$t('payment.expirationDate')}</label
			>
			<div id="card-expiry-element" class="mt-1 rounded-md border bg-white p-2.5 shadow-sm"></div>
		</div>
		<div>
			<label for="card-cvc-element" class="block text-sm font-medium text-gray-700"
				>{$t('payment.securityCode')}</label
			>
			<div id="card-cvc-element" class="mt-1 rounded-md border bg-white p-2.5 shadow-sm"></div>
		</div>
	</div>

	{#if error}
		<div class="mb-4 text-sm text-red-500">{error}</div>
	{/if}
</div>

<style lang="postcss">
	/* Add any additional styles here if needed */
</style>
