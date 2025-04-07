<script lang="ts">
	import { CheckCircle2 } from "lucide-svelte";
	import { Button } from "$lib/components/ui/button";
	import { getCurrencySymbol } from "$lib/components/payment/payments";
	import { cn } from "$lib/utils";

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
		"flex flex-col gap-6 p-6 rounded-lg border transition-all",
		plan.highlight
			? "border-primary/50 shadow-lg bg-gradient-to-b from-primary/5 to-transparent"
			: "border-border from-neutral-50/50 via-white to-neutral-50/50"
	)}
>
	<div class="flex justify-between items-start">
		<div>
			<h2 class="text-xl font-semibold text-primary">{plan.title}</h2>
			<p class="text-sm text-muted-foreground mt-1">{plan.description}</p>
		</div>
		<div class="p-2 rounded-full bg-primary/10">
			<svelte:component this={plan.icon} class="w-5 h-5 text-primary" />
		</div>
	</div>

	<div class="flex items-baseline gap-1 mt-2">
		<span class="text-3xl font-bold"
			>{plan.price.amount} {getCurrencySymbol(plan.price.currency)}</span
		>
		<span class="text-sm text-muted-foreground">/month</span>
	</div>

	<div class="grid gap-3 mt-2">
		{#each plan.features as feature}
			<div class="flex items-center gap-2">
				<CheckCircle2 class="w-4 h-4 text-green-500 flex-shrink-0" />
				<span class="text-sm">{feature}</span>
			</div>
		{/each}
	</div>

	<div class="mt-auto pt-4">
		<Button
			variant={plan.highlight ? "default" : "outline"}
			class="w-full font-medium"
			>{plan.cta}</Button
		>
	</div>
</div>