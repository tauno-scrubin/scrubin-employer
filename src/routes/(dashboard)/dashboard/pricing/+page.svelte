<script lang="ts">
	import { CheckCircle2, Users, Stethoscope, User2, ArrowRight, Sparkles } from "lucide-svelte";
	import { Button } from "$lib/components/ui/button";
	import { getCurrencySymbol } from "$lib/components/payment/payments";
	import Separator from "@/components/ui/separator/separator.svelte";
	
	const pricingOptions = [
		{ role: "Doctors", price: 500, duration: 12, icon: Stethoscope },
		{ role: "Nurses & Specialists", price: 250, duration: 12, icon: Users }
	];
</script>

<div class="max-w-3xl mx-auto py-8 px-4">


	<div class="mb-8">
		<h2 class="text-xl font-bold">Success Fee Structure</h2>
		<p class="text-muted-foreground mt-1">Our success fee is charged as monthly payments starting from employment contract confirmation</p>
	</div>

    <div class="p-6 rounded-lg mb-10 border border-border">
		<div class="flex items-center mb-3">
			<Sparkles class="w-6 h-6 text-primary mr-2" />
			<h1 class="text-2xl font-bold text-primary">Start with 0€</h1>
		</div>
		<p class="text-base mb-4">Begin recruiting immediately with no upfront costs or commitments</p>
		<div class="flex items-center text-sm text-neutral-500">
			<span>Only pay when you successfully hire</span>
			<ArrowRight class="w-4 h-4 ml-2" />
		</div>
	</div>


	<div class="space-y-4">
		{#each pricingOptions as option}
			<div class="flex items-center p-4 border rounded-lg border-border">
				<div class="p-2 rounded-full bg-primary/10 mr-4">
					<option.icon class="w-5 h-5 text-primary" />
				</div>
				
				<div class="flex-1">
					<h2 class="font-medium">{option.role}</h2>
				</div>
				
				<div class="text-right">
					<span class="text-xl font-bold">{option.price} {getCurrencySymbol('EUR')}</span>
					<p class="text-xs text-muted-foreground">per month for {option.duration} months</p>
				</div>
			</div>
		{/each}
	</div>
	
    <Separator class="my-4" />
	<div class="">
		<p class="text-sm text-muted-foreground">
			Success fee payable in monthly installments, commencing upon employment contract confirmation. No upfront costs.
		</p>
	</div>
</div>

