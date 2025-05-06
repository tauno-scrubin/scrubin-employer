<script lang="ts">
	import { CheckCircle2 } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { getCurrencySymbol } from '$lib/components/payment/payments';
	import { cn } from '$lib/utils';
	import { t } from '$lib/i18n';

	export let plan: {
		icon: any;
		title: string;
		price: { amount: number; currency: string };
		description: string;
		features: string[];
		cta: string;
		highlight?: boolean;
	};
</script>

<div
	class={cn(
		'flex flex-col gap-6 rounded-lg border p-6 transition-all',
		plan.highlight
			? 'border-primary/50 bg-gradient-to-b from-primary/5 to-transparent shadow-lg'
			: 'border-border from-neutral-50/50 via-white to-neutral-50/50'
	)}
>
	<div class="flex items-start justify-between">
		<div>
			<h2 class="text-xl font-semibold text-primary">{plan.title}</h2>
			<p class="mt-1 text-sm text-muted-foreground">{plan.description}</p>
		</div>
		<div class="rounded-full bg-primary/10 p-2">
			<svelte:component this={plan.icon} class="h-5 w-5 text-primary" />
		</div>
	</div>

	<div class="mt-2 flex items-baseline gap-1">
		<span class="text-3xl font-bold"
			>{plan.price.amount} {getCurrencySymbol(plan.price.currency)}</span
		>
		<span class="text-sm text-muted-foreground">{$t('dashboard.pricing.perMonth')}</span>
	</div>

	<div class="mt-2 grid gap-3">
		{#each plan.features as feature}
			<div class="flex items-center gap-2">
				<CheckCircle2 class="h-4 w-4 flex-shrink-0 text-green-500" />
				<span class="text-sm">{feature}</span>
			</div>
		{/each}
	</div>

	<div class="mt-auto pt-4">
		<Button variant={plan.highlight ? 'default' : 'outline'} class="w-full font-medium"
			>{plan.cta}</Button
		>
	</div>
</div>
