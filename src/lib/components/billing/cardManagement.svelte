<script lang="ts">
	import { onMount } from 'svelte';
	import { loadStripe, type Stripe, type StripeCardNumberElement, type StripeCardExpiryElement, type StripeCardCvcElement } from '@stripe/stripe-js';
	import { PUBLIC_STRIPE_PUBLIC_KEY, PUBLIC_STRIPE_PUBLIC_KEY_DEV } from '$env/static/public';
	import { currentUser, scrubinClient } from '@/scrubinClient/client';
	import type { PaymentMethodDto } from '@/scrubinClient/index';
	import { get } from 'svelte/store';
	import { toast } from 'svelte-sonner';
	import { t } from '$lib/i18n';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { CreditCard, Loader2, Plus, Trash2, Check, AlertCircle } from 'lucide-svelte';

	// Props
	interface Props {
		mode?: 'full' | 'selector';
		onCardSelected?: (cardId: string) => void;
		selectedCardId?: string;
		onCardsUpdated?: () => void;
	}

	let { mode = 'full', onCardSelected, selectedCardId = $bindable(), onCardsUpdated }: Props = $props();

	// State
	let cards = $state<PaymentMethodDto[]>([]);
	let isLoading = $state(true);
	let showAddCardDialog = $state(false);
	let isAddingCard = $state(false);
	let stripe: Stripe | null = $state(null);
	let cardNumberElement: StripeCardNumberElement | null = $state(null);
	let cardExpiryElement: StripeCardExpiryElement | null = $state(null);
	let cardCvcElement: StripeCardCvcElement | null = $state(null);
	let cardNumberContainer: HTMLDivElement;
	let cardExpiryContainer: HTMLDivElement;
	let cardCvcContainer: HTMLDivElement;
	let removingCardId: string | null = $state(null);
	let settingDefaultId: string | null = $state(null);

	// Load cards
	const loadCards = async () => {
		try {
			isLoading = true;
			const paymentMethods = await scrubinClient.company.getPaymentMethods();
			cards = paymentMethods;

			// Auto-select default card if in selector mode and no card selected
			if (mode === 'selector' && !selectedCardId) {
				const defaultCard = cards.find((c) => c.isDefault);
				if (defaultCard) {
					selectedCardId = defaultCard.id;
					onCardSelected?.(defaultCard.id);
				} else if (cards.length > 0) {
					selectedCardId = cards[0].id;
					onCardSelected?.(cards[0].id);
				}
			}
		} catch (err) {
			console.error('Failed to load payment methods:', err);
			toast.error($t('pricing.cardManagement.loadError') || 'Failed to load payment methods');
		} finally {
			isLoading = false;
		}
	};

	// Initialize Stripe
	const initStripe = async () => {
		const isDemoUser = get(currentUser)?.isDemoUser || false;
		const stripePublicKey = isDemoUser ? PUBLIC_STRIPE_PUBLIC_KEY_DEV : PUBLIC_STRIPE_PUBLIC_KEY;
		stripe = await loadStripe(stripePublicKey);

		if (stripe && cardNumberContainer && cardExpiryContainer && cardCvcContainer) {
			const elements = stripe.elements();
			
			const style = {
				base: {
					fontSize: '16px',
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

			cardNumberElement.mount(cardNumberContainer);
			cardExpiryElement.mount(cardExpiryContainer);
			cardCvcElement.mount(cardCvcContainer);
		}
	};

	// Handle add card dialog open
	const openAddCardDialog = () => {
		showAddCardDialog = true;
		// Initialize Stripe when dialog opens
		setTimeout(() => {
			if (cardNumberContainer && cardExpiryContainer && cardCvcContainer && !cardNumberElement) {
				initStripe();
			}
		}, 100);
	};

	// Handle add card
	const handleAddCard = async () => {
		if (!stripe || !cardNumberElement) {
			toast.error($t('pricing.cardManagement.stripeNotLoaded') || 'Payment system not ready');
			return;
		}

		try {
			isAddingCard = true;

			// Create payment method using Stripe.js
			const { error, paymentMethod } = await stripe.createPaymentMethod({
				type: 'card',
				card: cardNumberElement
			});

			if (error) {
				toast.error(error.message || 'Failed to process card');
				return;
			}

			// Send payment method ID to backend
			await scrubinClient.company.addPaymentMethod({
				paymentMethodId: paymentMethod.id,
				setAsDefault: cards.length === 0 // First card becomes default
			});

			toast.success($t('pricing.cardManagement.cardAdded') || 'Card added successfully');
			showAddCardDialog = false;
			
			// Clear all card elements
			cardNumberElement?.clear();
			cardExpiryElement?.clear();
			cardCvcElement?.clear();

			// Reload cards
			await loadCards();
			onCardsUpdated?.();
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to add card';
			toast.error(errorMessage);
			console.error('Add card error:', err);
		} finally {
			isAddingCard = false;
		}
	};

	// Handle remove card
	const handleRemoveCard = async (cardId: string) => {
		const card = cards.find((c) => c.id === cardId);
		
		// Prevent removal of default card or last card
		if (card?.isDefault) {
			toast.error($t('pricing.cardManagement.cannotRemoveDefault') || 'Cannot remove default payment method');
			return;
		}
		
		if (cards.length === 1) {
			toast.error($t('pricing.cardManagement.cannotRemoveLast') || 'Cannot remove the only payment method');
			return;
		}

		try {
			removingCardId = cardId;
			await scrubinClient.company.removePaymentMethod(cardId);
			toast.success($t('pricing.cardManagement.cardRemoved') || 'Card removed successfully');

			// Reload cards
			await loadCards();
			onCardsUpdated?.();
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to remove card';
			toast.error(errorMessage);
			console.error('Remove card error:', err);
		} finally {
			removingCardId = null;
		}
	};

	// Handle set default
	const handleSetDefault = async (cardId: string) => {
		try {
			settingDefaultId = cardId;
			await scrubinClient.company.setDefaultPaymentMethod(cardId);
			toast.success($t('pricing.cardManagement.defaultSet') || 'Default card updated');

			// Reload cards
			await loadCards();
			onCardsUpdated?.();
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to set default card';
			toast.error(errorMessage);
			console.error('Set default error:', err);
		} finally {
			settingDefaultId = null;
		}
	};

	// Handle card selection in selector mode
	const handleCardSelect = (cardId: string) => {
		if (mode === 'selector') {
			selectedCardId = cardId;
			onCardSelected?.(cardId);
		}
	};

	// Initialize
	onMount(() => {
		loadCards();
	});
</script>

{#if mode === 'full'}
	<Card>
		<CardHeader>
			<div class="flex items-center justify-between">
				<div>
					<CardTitle>{$t('pricing.cardManagement.title') || 'Payment Methods'}</CardTitle>
					<CardDescription>
						{$t('pricing.cardManagement.description') || 'Manage your saved payment methods'}
					</CardDescription>
				</div>
				<Button onclick={openAddCardDialog} size="sm">
					<Plus class="mr-2 h-4 w-4" />
					{$t('pricing.cardManagement.addCard') || 'Add Card'}
				</Button>
			</div>
		</CardHeader>
		<CardContent>
			{#if isLoading}
				<div class="flex h-32 items-center justify-center">
					<Loader2 class="h-5 w-5 animate-spin text-primary/70" />
				</div>
			{:else if cards.length === 0}
				<div class="flex flex-col items-center justify-center py-8 text-center">
					<CreditCard class="mb-3 h-12 w-12 text-muted-foreground/50" />
					<p class="text-sm text-muted-foreground">
						{$t('pricing.cardManagement.noCards') || 'No payment methods saved'}
					</p>
					<Button onclick={openAddCardDialog} size="sm" class="mt-4" variant="outline">
						<Plus class="mr-2 h-4 w-4" />
						{$t('pricing.cardManagement.addFirstCard') || 'Add your first card'}
					</Button>
				</div>
			{:else}
				<div class="space-y-3">
					{#each cards as card}
						<div class="flex items-center justify-between rounded-lg border border-border p-4">
							<div class="flex items-center gap-4">
								<div class="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
									<CreditCard class="h-5 w-5 text-muted-foreground" />
								</div>
								<div>
									<div class="flex items-center gap-2">
										<span class="font-medium">
											{card.card.brand.toUpperCase()} •••• {card.card.last4}
										</span>
										{#if card.isDefault}
											<span
												class="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
											>
												<Check class="mr-1 h-3 w-3" />
												{$t('pricing.cardManagement.default') || 'Default'}
											</span>
										{/if}
									</div>
									<p class="text-sm text-muted-foreground">
										{$t('pricing.cardManagement.expires') || 'Expires'} {card.card.expMonth}/{card.card
											.expYear}
									</p>
								</div>
							</div>
							<div class="flex items-center gap-2">
								{#if !card.isDefault}
									<Button
										variant="ghost"
										size="sm"
										onclick={() => handleSetDefault(card.id)}
										disabled={settingDefaultId === card.id}
									>
										{#if settingDefaultId === card.id}
											<Loader2 class="h-4 w-4 animate-spin" />
										{:else}
											{$t('pricing.cardManagement.setDefault') || 'Set Default'}
										{/if}
									</Button>
								{/if}
								{#if !card.isDefault && cards.length > 1}
									<Button
										variant="ghost"
										size="sm"
										onclick={() => handleRemoveCard(card.id)}
										disabled={removingCardId === card.id}
										class="text-destructive hover:bg-destructive/10 hover:text-destructive"
									>
										{#if removingCardId === card.id}
											<Loader2 class="h-4 w-4 animate-spin" />
										{:else}
											<Trash2 class="h-4 w-4" />
										{/if}
									</Button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</CardContent>
	</Card>
{:else}
	<!-- Selector mode -->
	<div class="space-y-3">
		{#if isLoading}
			<div class="flex h-20 items-center justify-center">
				<Loader2 class="h-5 w-5 animate-spin text-primary/70" />
			</div>
		{:else if cards.length === 0}
			<div class="rounded-lg border border-dashed border-border p-4 text-center">
				<AlertCircle class="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
				<p class="mb-2 text-sm text-muted-foreground">
					{$t('pricing.cardManagement.noCardsSelector') || 'No saved cards. Add one to continue.'}
				</p>
				<Button onclick={openAddCardDialog} size="sm">
					<Plus class="mr-2 h-4 w-4" />
					{$t('pricing.cardManagement.addCard') || 'Add Card'}
				</Button>
			</div>
		{:else}
			<div class="space-y-2">
				{#each cards as card}
					<button
						type="button"
						onclick={() => handleCardSelect(card.id)}
						class="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 {selectedCardId === card.id ? 'border-primary bg-primary/5' : ''}"
					>
						<div class="flex items-center gap-3">
							<div
								class="flex h-8 w-8 items-center justify-center rounded-md {selectedCardId === card.id ? 'bg-primary' : 'bg-muted'}"
							>
								<CreditCard
									class="h-4 w-4 {selectedCardId === card.id ? 'text-primary-foreground' : 'text-muted-foreground'}"
								/>
							</div>
							<div>
								<div class="flex items-center gap-2">
									<span class="text-sm font-medium">
										{card.card.brand.toUpperCase()} •••• {card.card.last4}
									</span>
									{#if card.isDefault}
										<span class="text-xs text-muted-foreground">
											({$t('pricing.cardManagement.default') || 'Default'})
										</span>
									{/if}
								</div>
								<p class="text-xs text-muted-foreground">
									{$t('pricing.cardManagement.expires') || 'Expires'} {card.card.expMonth}/{card.card
										.expYear}
								</p>
							</div>
						</div>
						{#if selectedCardId === card.id}
							<Check class="h-5 w-5 text-primary" />
						{/if}
					</button>
				{/each}
			</div>
			<Button onclick={openAddCardDialog} size="sm" variant="outline" class="w-full">
				<Plus class="mr-2 h-4 w-4" />
				{$t('pricing.cardManagement.addAnotherCard') || 'Add Another Card'}
			</Button>
		{/if}
	</div>
{/if}

<!-- Add Card Dialog -->
<Dialog.Root bind:open={showAddCardDialog}>
	<Dialog.Content class="mx-4 sm:mx-auto sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{$t('pricing.cardManagement.addCardTitle') || 'Add Payment Card'}</Dialog.Title>
			<Dialog.Description>
				{$t('pricing.cardManagement.addCardDescription') ||
					'Enter your card details. Your information is securely processed by Stripe.'}
			</Dialog.Description>
		</Dialog.Header>

		<div class="py-4 space-y-4">
			<div class="space-y-2">
				<div class="text-sm font-medium">
					{$t('pricing.cardManagement.cardNumber') || 'Card Number'}
				</div>
				<div class="rounded-md border border-border p-3">
					<div bind:this={cardNumberContainer} class="min-h-6"></div>
				</div>
			</div>
			
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<div class="text-sm font-medium">
						{$t('pricing.cardManagement.expiryDate') || 'Expiry Date'}
					</div>
					<div class="rounded-md border border-border p-3">
						<div bind:this={cardExpiryContainer} class="min-h-6"></div>
					</div>
				</div>
				
				<div class="space-y-2">
					<div class="text-sm font-medium">
						{$t('pricing.cardManagement.cvc') || 'CVC'}
					</div>
					<div class="rounded-md border border-border p-3">
						<div bind:this={cardCvcContainer} class="min-h-6"></div>
					</div>
				</div>
			</div>
			
			<p class="text-xs text-muted-foreground">
				{$t('pricing.cardManagement.secureInfo') ||
					'Your card details are encrypted and never stored on our servers.'}
			</p>
		</div>

		<Dialog.Footer class="flex-col gap-2 sm:flex-row sm:gap-0">
			<Button
				type="button"
				variant="outline"
				onclick={() => {
					showAddCardDialog = false;
					cardNumberElement?.clear();
					cardExpiryElement?.clear();
					cardCvcElement?.clear();
				}}
				disabled={isAddingCard}
				class="w-full text-sm sm:w-auto"
			>
				{$t('pricing.cardManagement.cancel') || 'Cancel'}
			</Button>
			<Button
				onclick={handleAddCard}
				disabled={isAddingCard || !stripe}
				class="w-full text-sm sm:w-auto"
			>
				{#if isAddingCard}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{$t('pricing.cardManagement.adding') || 'Adding...'}
				{:else}
					<CreditCard class="mr-2 h-4 w-4" />
					{$t('pricing.cardManagement.addCard') || 'Add Card'}
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
