<script lang="ts">
	import { CheckCircle2, Users, Stethoscope, User2, ArrowRight, Sparkles, BadgeCheck, Clock } from "lucide-svelte";
	import { Button } from "$lib/components/ui/button";
	import { getCurrencySymbol } from "$lib/components/payment/payments";
	import Separator from "@/components/ui/separator/separator.svelte";
	import { onMount } from "svelte";
	import { page } from "$app/stores";
	import { scrubinClient } from "@/scrubinClient/client.js";
	import type { AvailablePlansResponse, CompanyPlanSummary } from "@/scrubinClient/index.js";
	import { fade } from "svelte/transition";
	import { currentUserCompany } from "../../../../lib/scrubinClient/client";
	let {
		data
	} = $props();

	const pricingOptions = data.pricingOptions;
	const startingFee = data.startingFee;
	const currency = data.currency;
	
	let availablePlans = $state<AvailablePlansResponse['plans']>([]);
	let activePlans = $state<CompanyPlanSummary[]>([]);
	let isLoading = $state(true);
	let error: string | null = $state(null);
	
	onMount(async () => {
		try {
			availablePlans = (await scrubinClient.company.getAvailablePlans()).plans;
			activePlans = await scrubinClient.company.getActivePlans();

			console.log(availablePlans);
			isLoading = false;
		} catch (err) {
			error = err.message;
			isLoading = false;
		}
	});
	
	const handleStartPlan = async (planType) => {
		try {
			await scrubinClient.company.startPlan(planType);
			activePlans = await scrubinClient.company.getActivePlans();
		} catch (err) {
			error = err.message;
		}
	};
	
	const handleEndPlan = async (id) => {
		try {
			await scrubinClient.company.endPlan(id);
			activePlans = await scrubinClient.company.getActivePlans();
		} catch (err) {
			error = err.message;
		}
	};
</script>

<div class="max-w-3xl mx-auto py-8 px-4">
	{#if error}
		<div class="p-4 mb-6 bg-destructive/10 border border-destructive text-destructive rounded-md">
			{error}
		</div>
	{/if}

	<div class="mb-8">
		<h2 class="text-xl font-bold">Pricing Plans</h2>
		<p class="text-muted-foreground mt-1">Choose the plan that works best for your healthcare recruitment needs.</p>
	</div>
	
	<!-- Active Plans Section -->
	{#if activePlans.length > 0}
		<div transition:fade  class="mb-8">
			<h3 class="text-lg font-semibold mb-4">Your Active Plans</h3>
			<div class="space-y-4">
				{#each activePlans as plan}
					<div class="p-6 rounded-lg border">
						<div class="flex justify-between items-start mb-4">
							<div>
								<div class="flex items-center">
									<BadgeCheck class="w-5 h-5 text-primary mr-2" />
									<h3 class="text-lg font-semibold">{plan.planType.replace('_', ' ').toUpperCase()}</h3>
								</div>
								<p class="text-sm text-muted-foreground mt-1">
									Active since {new Date(plan.dateStarted).toLocaleDateString()}
								</p>
							</div>
							<Button variant="outline" size="sm" onclick={() => handleEndPlan(plan.id)}>
								End Plan
							</Button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}


	{#if activePlans.length < 1 && $currentUserCompany.countryIso !== 'EST'}
	<div class="p-6 rounded-lg mb-10 border border-border">
		<div class="flex items-center mb-3">
			<Sparkles class="w-6 h-6 text-primary mr-2" />
			<h1 class="text-lg font-bold text-primary">Start with {startingFee} {getCurrencySymbol(currency)}</h1>
		</div>
		{#if startingFee > 0}
			<p class="text-base mb-4">Begin recruiting with a {startingFee} {getCurrencySymbol(currency)} starting fee</p>
		{:else}
			<p class="text-base mb-4">Begin recruiting immediately with no upfront costs or commitments</p>
		{/if}
		<div class="flex items-center text-sm text-neutral-500">
			<span>Only pay when you successfully hire</span>
			<ArrowRight class="w-4 h-4 ml-2" />
		</div>
		</div>
	{/if}

	<!-- Available Plans Section -->
	{#if isLoading}
		<div class="flex justify-center my-8">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
		</div>
		{:else if availablePlans.filter(plan => !activePlans.find(activePlan => activePlan.planType === plan.planType)).length > 0}		
		<div class="space-y-6 mb-8">
			<h3 class="text-lg font-semibold">Available Plans</h3>
			{#each availablePlans.filter(plan => !activePlans.find(activePlan => activePlan.planType === plan.planType)) as plan}
				<div class="p-6 rounded-lg border border-border">
					<div class="flex justify-between items-start mb-4">
						<div>
							<h3 class="text-lg font-semibold">{plan.planType.replace('_', ' ').toUpperCase()}</h3>
							{#if plan.pricingGeneral && plan.pricingGeneral.amount > 0}
								<p class="text-sm text-muted-foreground mt-1">
									General fee: {plan.pricingGeneral.amount || 0} {getCurrencySymbol(plan.pricingGeneral.currency)}
								</p>
							{:else}
								<p class="text-sm text-muted-foreground mt-1">No general fee</p>
							{/if}
						</div>
						<Button onclick={() => handleStartPlan(plan.planType)}>
							Start Plan
						</Button>
					</div>
					
					{#if plan.pricingSuccess}
						<div class="mt-4">
							<h4 class="text-sm font-medium mb-2">Success Fees</h4>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div class="p-4 rounded-md bg-muted/50">
									<div class="flex items-center mb-2">
										<Stethoscope class="w-4 h-4 mr-2 text-primary" />
										<span class="font-medium">Doctors</span>
									</div>
									<div class="space-y-1 text-sm">
										<div class="flex justify-between">
											<span>Start fee:</span>
											<span>
												{#if plan.pricingSuccess.doctor.startFee.vatAmount > 0}
													{plan.pricingSuccess.doctor.startFee.amount + plan.pricingSuccess.doctor.startFee.vatAmount} {getCurrencySymbol(plan.pricingSuccess.doctor.startFee.currency)}
													<span class="text-xs text-muted-foreground">
														(incl {plan.pricingSuccess.doctor.startFee.vatPercentage}% VAT)
													</span>
												{:else}
													{plan.pricingSuccess.doctor.startFee.amount} {getCurrencySymbol(plan.pricingSuccess.doctor.startFee.currency)}
												{/if}
											</span>
										</div>
										<div class="flex justify-between">
											<span>Success fee:</span>
											<span>
												{#if plan.pricingSuccess.doctor.successFee.vatAmount > 0}
													{plan.pricingSuccess.doctor.successFee.amount + plan.pricingSuccess.doctor.successFee.vatAmount} {getCurrencySymbol(plan.pricingSuccess.doctor.successFee.currency)}
													<span class="text-xs text-muted-foreground">
														(incl {plan.pricingSuccess.doctor.successFee.vatPercentage}% VAT)
													</span>
												{:else}
													{plan.pricingSuccess.doctor.successFee.amount} {getCurrencySymbol(plan.pricingSuccess.doctor.successFee.currency)}
												{/if}
											</span>
										</div>
									</div>
								</div>
								
								<div class="p-4 rounded-md bg-muted/50">
									<div class="flex items-center mb-2">
										<Users class="w-4 h-4 mr-2 text-primary" />
										<span class="font-medium">Other Healthcare Professionals</span>
									</div>
									<div class="space-y-1 text-sm">
										<div class="flex justify-between">
											<span>Start fee:</span>
											<span>
												{#if plan.pricingSuccess.other.startFee.vatAmount > 0}
													{plan.pricingSuccess.other.startFee.amount + plan.pricingSuccess.other.startFee.vatAmount} {getCurrencySymbol(plan.pricingSuccess.other.startFee.currency)}
													<span class="text-xs text-muted-foreground">
														(incl {plan.pricingSuccess.other.startFee.vatPercentage}% VAT)
													</span>
												{:else}
													{plan.pricingSuccess.other.startFee.amount} {getCurrencySymbol(plan.pricingSuccess.other.startFee.currency)}
												{/if}
											</span>
										</div>
										<div class="flex justify-between">
											<span>Success fee:</span>
											<span>
												{#if plan.pricingSuccess.other.successFee.vatAmount > 0}
													{plan.pricingSuccess.other.successFee.amount + plan.pricingSuccess.other.successFee.vatAmount} {getCurrencySymbol(plan.pricingSuccess.other.successFee.currency)}
													<span class="text-xs text-muted-foreground">
														(incl {plan.pricingSuccess.other.successFee.vatPercentage}% VAT)
													</span>
												{:else}
													{plan.pricingSuccess.other.successFee.amount} {getCurrencySymbol(plan.pricingSuccess.other.successFee.currency)}
												{/if}
											</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	{#if $currentUserCompany.countryIso !== 'EST'}
    <div class="mb-6">
        <h2 class="text-lg font-medium mb-2">Need someone short-term?</h2>
        <p class="text-muted-foreground">For <span class="font-medium">locum</span> placements or short-term contracts, we'll tailor the fee to the contract duration — starting from <span class="font-medium">{getCurrencySymbol(currency)}150/month</span>.</p>
    </div>
	
    <Separator class="my-4" />
	<div class="">
		<p class="text-sm text-muted-foreground">
				Success fee payable in monthly installments, commencing upon employment contract confirmation. No upfront costs.
			</p>
		</div>
	{/if}
</div>

