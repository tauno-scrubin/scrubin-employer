<script lang="ts">
    import * as Card from "$lib/components/ui/card/index.js";
    import * as Tabs from "$lib/components/ui/tabs/index.js";
    import Button from "$lib/components/ui/button/button.svelte";
    import Badge from "$lib/components/ui/badge/badge.svelte";
    import { 
        Briefcase, 
        MapPin, 
        Clock, 
        DollarSign, 
        GraduationCap, 
        Languages, 
        Calendar, 
        Car, 
        Building, 
        ArrowLeft,
        Users,
        FileText,
        Sparkle,
        Mail,
        Phone
    } from "lucide-svelte";
    import SearchView from "$lib/components/dashboard/searchView.svelte";
	import FunnelChart from "@/components/ui/layer-chart/funnelChart.svelte";
	import SingleWorker from "@/components/dashboard/singleWorker.svelte";
	import { page } from "$app/state";
	import { formatStatus, getStatusColor } from "@/components/payment/payments.js";
	import Separator from "@/components/ui/separator/separator.svelte";
    import { onMount } from "svelte";
    import { scrubinClient } from "$lib/scrubinClient/client";
    import type { InterestedCandidate } from "$lib/scrubinClient";
    import * as Avatar from "$lib/components/ui/avatar";
	import InterestedWorkerDialog from "@/components/dashboard/interestedWorkerDialog.svelte";
	import QuestionsInHunt from "@/components/dashboard/questionsInHunt.svelte";
    import PaymentDialog from "$lib/components/payment/paymentDialog.svelte";
	import { toast } from "svelte-sonner";

    let { data } = $props();
    let hunt = $derived(data.hunt);
    let interestedCandidates = $state<InterestedCandidate[]>([]);
    let isLoading = $state(true);
    let showInterestedWorkerDialog = $state(false);
    let selectedCandidateId = $state(0);
    let paymentDialogOpen = $state(false);
    let chargeableAmount = $state({
        amount: 0,
        currency: 'EUR'
    });

    onMount(async () => {
        try {
            interestedCandidates = await scrubinClient.hunt.getInterestedCandidates(hunt.huntId);
            
            // Check URL for candidateId and open dialog if present
            const candidateId = page.url.searchParams.get('candidateId');
            const candidateExists = interestedCandidates.find(candidate => candidate.candidateId === parseInt(candidateId || '0'));
            if (candidateId && candidateExists) {
                selectedCandidateId = parseInt(candidateId);
                showInterestedWorkerDialog = true;
                activeTab = "statistics"; // Switch to statistics tab
            }
        } catch (error) {
            console.error("Failed to fetch interested candidates:", error);
        } finally {
            isLoading = false;
        }
    });

    let funnelData = $derived([
        { name: 'Total Huntables', value: data.stats.totalHuntables },
        { name: 'Contacted', value: data.stats.totalHuntablesContacted },
        { name: 'Interested', value: data.stats.totalHuntablesInterested }
    ]);
    
    // Define tabs for better organization
    const tabs = [
        { id: "details", label: "Job Details", icon: FileText },
        { id: "qualifications", label: "Qualifications", icon: GraduationCap },
        { id: "location", label: "Location", icon: MapPin }
    ];
    
    let activeTab = $state("details");

    function goToPrevPage() {
        window.history.back();
    }

    function formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function handleActivateOrPay() {
        console.log(hunt);
        if (hunt.status === 'PENDING') {
            activateHunt();
        } else if (hunt.status === 'AWAITING_PAYMENT') {
            if (hunt.planType === 'success_fee' && hunt.startFee?.amount > 0) {
                chargeableAmount.amount = hunt.startFee.amount;
                chargeableAmount.currency = hunt.startFee.currency;
                paymentDialogOpen = true;
            } else if (hunt.planType === 'success_fee' && hunt.startFee?.amount == 0) {
                toast.error('There is an issue with this Hunt pricing, please contact support.');
            }
        }
    }

    async function activateHunt() {
        try {
            const response = await scrubinClient.hunt.activateHuntV2(hunt.huntId);
            if (hunt.planType === 'success_fee' && hunt.startFee?.amount > 0) {
                chargeableAmount.amount = hunt.startFee.amount;
                chargeableAmount.currency = hunt.startFee.currency;
                paymentDialogOpen = true;
            } else {
                window.location.reload();
            }
        } catch (error) {
            console.error("Failed to activate hunt:", error);
            toast.error("Failed to activate hunt. Please try again.");
        }
    }

    function onPaymentSuccess() {
        window.location.reload();
        toast.success("Payment successful! Hunt is now active.");
    }
</script>

<InterestedWorkerDialog bind:open={showInterestedWorkerDialog} bind:huntId={hunt.huntId} bind:candidateId={selectedCandidateId} />

<PaymentDialog 
    bind:open={paymentDialogOpen}
    huntId={hunt.huntId}
    amount={chargeableAmount.amount}
    currency={chargeableAmount.currency}
    onSuccess={onPaymentSuccess}
/>

<div class="container mx-auto py-6 space-y-6 max-w-7xl">
    <div class="flex items-center gap-4 mb-6">

            <Button onclick={goToPrevPage} variant="outline" size="icon" class="h-9 w-9">
                <ArrowLeft class="h-4 w-4" />
            </Button>

        <div>
            <h1 class="text-2xl font-bold tracking-tight">{hunt.requirements.jobTitle}</h1>
            {#if hunt.requirements.address}
            <p class="text-sm text-muted-foreground">
                {#if hunt.requirements.address.city}
                    {hunt.requirements.address.city}, 
                {/if}
                {#if hunt.requirements.address.stateProvinceRegion}
                    {hunt.requirements.address.stateProvinceRegion}
                {/if}
            </p>
            {/if}
        </div>
    </div>

    <!-- Status badge at the top -->
    <Tabs.Root bind:value={activeTab} class="w-full">
        <Tabs.List class="grid w-fit grid-cols-3">
          <Tabs.Trigger value="details">Details</Tabs.Trigger>
          <Tabs.Trigger value="statistics">Statistics</Tabs.Trigger>
          <Tabs.Trigger value="questions">Questions</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="details">

            <div class="flex flex-col gap-4 bg-blue-50/80 p-4 rounded-md">
                <div class="bg-white rounded-lg  shadow-sm p-4 flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        <div class="{getStatusColor(hunt.status)}  p-2 rounded-full">
                            <Sparkle fill="currentColor" strokeWidth=1 class="w-4 h-4 {hunt.status === 'ACTIVE' ? 'animate-[spin_4s_linear_infinite]' : ''}" />
                        </div>
                        <div>
                            <h2 class="font-medium">Hunt</h2>
                            <p class="text-sm text-muted-foreground">Created on {new Date().toLocaleDateString()}</p>
                        </div>
                    </div>
                    {#if hunt.status === 'PENDING' || hunt.status === 'AWAITING_PAYMENT'}
                        <div class="flex items-center gap-2">
                            <Badge variant="outline" class="px-3 py-1 {getStatusColor(hunt.status)} border-transparent">
                                {formatStatus(hunt.status)}
                            </Badge>
                            <Button 
                                variant="default" 
                                onclick={handleActivateOrPay}
                                class="ml-2"
                            >
                                {hunt.status === 'PENDING' ? 'Activate Hunt' : 'Complete Payment'}
                            </Button>
                        </div>
                    {:else}
                        <Badge variant="outline" class="px-3 py-1 {getStatusColor(hunt.status)} border-transparent">
                            {formatStatus(hunt.status)}
                        </Badge>
                    {/if}
                </div>
        
            <div class=" bg-white rounded-md p-4 shadow-sm">
              
                <h2 class="text-xl font-medium mb-4">Job Requirements</h2>
                
        
                    <div class="space-y-3">
                        <div class="grid grid-cols-1 gap-4 text-sm border-b pb-3">
                            <div class="w-full grid grid-cols-[150px_1fr] items-start">
                                <h4 class="font-semibold">Job title</h4>
                                <p class="{hunt.requirements.jobTitle ? 'text-gray-900' : 'text-gray-500'}">{hunt.requirements.jobTitle || 'Not specified'}</p>
                            </div>
        
                            <div class="w-full grid grid-cols-[150px_1fr] items-start">
                                <h4 class="font-semibold">Job description</h4>
                                <p class="{hunt.requirements.jobDescription ? 'text-gray-900' : 'text-gray-500'}">{hunt.requirements.jobDescription || 'Not specified'}</p>
                            </div>
        
                            <div class="w-full grid grid-cols-[150px_1fr] items-start">
                                <h4 class="font-semibold">Professions</h4>
                                <div class="flex flex-row gap-2 flex-wrap">
                                    {#each hunt.requirements.professions || [] as profession}
                                        <span class="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">{profession}</span>
                                    {/each}
                                </div>
                            </div>
        
                        </div>
                        
                        <div class="grid grid-cols-1 gap-4 text-sm">
                            <div class="w-full grid grid-cols-[150px_1fr] items-start">
                                <h4 class="font-semibold">Specialization</h4>
                                <p class="{hunt.requirements.specialization ? 'text-gray-900' : 'text-gray-500'}">{hunt.requirements.specialization || 'Not specified'}</p>
                            </div>
                            
                            <div class="w-full grid grid-cols-[150px_1fr] items-start">
                                <h4 class="font-semibold">Work Experience</h4>
                                <p class="{hunt.requirements.jobRequiredWorkExperience ? 'text-gray-900' : 'text-gray-500'}">{hunt.requirements.jobRequiredWorkExperience || 0} years</p>
                            </div>
                            
                            <div class="w-full grid grid-cols-[150px_1fr] items-start">
                                <h4 class="font-semibold">Location</h4>
                                <p class="{hunt.requirements.address?.city || hunt.requirements.address?.stateProvinceRegion ? 'text-gray-900' : 'text-gray-500'}">
                                    {hunt.requirements.country}, 
                                    {hunt.requirements.address?.city || ''} 
                                    {hunt.requirements.address?.stateProvinceRegion ? 
                                        (Array.isArray(hunt.requirements.address.stateProvinceRegion) ? 
                                            hunt.requirements.address.stateProvinceRegion.join(', ') : 
                                            hunt.requirements.address.stateProvinceRegion) : 
                                        ''}
                                </p>
                            </div>
                            
                            <div class="w-full grid grid-cols-[150px_1fr] items-start">
                                <h4 class="font-semibold">Work Time</h4>
                                <p class="{hunt.requirements.workTimeType ? 'text-gray-900' : 'text-gray-500'}">{hunt.requirements.workTimeType?.join(', ') || 'Not specified'}</p>
                            </div>
                            
                            <div class="w-full grid grid-cols-[150px_1fr] items-start">
                                <h4 class="text-gray-900 font-semibold">Languages</h4>
                                <div class="flex flex-wrap gap-1">
                                    {#each hunt.requirements.jobRequiredLanguages || [] as language}
                                        <span class="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">{language}</span>
                                    {/each}
                                </div>
                            </div>
                            
                            <div class="w-full grid grid-cols-[150px_1fr] items-start">
                                <h4 class="font-semibold">Salary</h4>
                                <p class="{hunt.requirements.salary?.amountStart || hunt.requirements.salary?.amountEnd ? 'text-gray-900' : 'text-gray-500'}">
                                    {#if hunt.requirements.salary?.amountStart && hunt.requirements.salary?.amountEnd}
                                        {hunt.requirements.salary.amountStart} - {hunt.requirements.salary.amountEnd} 
                                        {hunt.requirements.salary.currency || ''} ({hunt.requirements.salary.type || ''})
                                    {:else}
                                        {hunt.requirements.salary?.amountText || 'Not specified'}
                                    {/if}
                                </p>
                            </div>
                        </div>
                        
                        <div class="border-t pt-3 mt-4">
                            <h4 class="text-xl font-medium mb-4">Required Qualifications</h4>
                            <p class="{hunt.requirements.jobRequiredQualifications ? 'text-gray-900' : 'text-gray-500'} text-sm">{hunt.requirements.jobRequiredQualifications || 'Not specified'}</p>
                        </div>
                        
                        <div class="border-t pt-3">
                            <h4 class="text-xl font-medium mb-4">Additional Requirements</h4>
                            <div class="grid grid-cols-1 gap-2 mt-1 text-sm">
        
        
                                <div class="w-full grid grid-cols-[150px_1fr] items-start">
                                    <h4 class="font-semibold">Driving License</h4>
                                    <p class="{hunt.requirements.extras?.drivingLicenceRequired ? 'text-gray-900' : 'text-gray-500'}">{hunt.requirements.extras?.drivingLicenceRequired ? 'Required' : 'Not required'}</p>
                                </div>
        
        
                                <div class="w-full grid grid-cols-[150px_1fr] items-start">
                                    <h4 class="font-semibold">Personal Car</h4>
                                    <p class="{hunt.requirements.extras?.personalCarRequired ? 'text-gray-900' : 'text-gray-500'}">{hunt.requirements.extras?.personalCarRequired ? 'Required' : 'Not required'}</p>
                                </div>
                                
                                {#if hunt.requirements.extras?.accommodationCompensationType}
                                <div class="w-full grid grid-cols-[150px_1fr] items-start">
                                    <h4 class="font-semibold">Accommodation</h4>
                                    <p class="{hunt.requirements.extras?.accommodationCompensationType ? 'text-gray-900' : 'text-gray-500'}">{hunt.requirements.extras?.accommodationCompensationType}</p>
                                </div>
                                {/if}
        
                                {#if hunt.requirements.extras?.transportCompensationType}
                                <div class="w-full grid grid-cols-[150px_1fr] items-start">
                                    <h4 class="font-semibold">Transport</h4>
                                    <p class="{hunt.requirements.extras?.transportCompensationType ? 'text-gray-900' : 'text-gray-500'}">{hunt.requirements.extras?.transportCompensationType}</p>
                                </div>
                                {/if}
        
                            
                            </div>
                        </div>
                    </div>
                
            </div>
        </div>
         
        </Tabs.Content>
        <Tabs.Content value="statistics">
            <div class="bg-blue-50/80 rounded-md p-4">
                <div class="flex flex-col bg-white rounded-md p-4 gap-4">
            <h4 class="text-gray-900 text-xl font-semibold">Hunt Conversion Funnel</h4>
            <div class="grid grid-cols-3 gap-4">
         {#each funnelData as item}       
            <div class="border rounded-md p-4 gap-2 flex flex-col">
                <h5 class="text-gray-500 text-sm font-medium">{item.name}</h5>
                <p class="text-gray-900 font-semibold text-3xl">{item.value}</p>
            </div>
         {/each}
            </div>
            <!-- <FunnelChart 
            data={funnelData} 
            title="Hunt Conversion Funnel" 
            colors={['#38bdf8', '#818cf8', '#8b5cf6']} 
            height="400px"
        /> -->

        <Separator class="mb-2" />
        <h4 class="text-gray-900 text-xl font-semibold">Candidates</h4>
  
    <div class="flex flex-col gap-4">
        {#if isLoading}
            <div class="flex justify-center items-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        {:else if interestedCandidates.length === 0}
            <div class="flex flex-col gap-2">
                <p class="text-gray-900 font-semibold text-lg">We're on the Hunt for Great Talent!</p>
                <p class="text-gray-500 text-sm">No interested candidates yet, but we're reaching out to professionals who fit your needs. Check back soon! We'll let you know as soon as we have updates.</p>
            </div>
        {:else}
            <div class="grid gap-4">
                {#each interestedCandidates as candidate}
                    <Card.Root class="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onclick={() => {
                        showInterestedWorkerDialog = true;
                        selectedCandidateId = candidate.candidateId;
                    }}>
                        <Card.Content class="p-4">
                            <div class="flex items-start gap-4">
                                <Avatar.Root class="h-12 w-12 bg-primary/10 text-primary">
                                    <Avatar.Fallback>
                                        {candidate.firstName.charAt(0)}{candidate.lastName.charAt(0)}
                                    </Avatar.Fallback>
                                </Avatar.Root>
                                
                                <div class="flex-1 space-y-1">
                                    <div class="flex justify-between items-start">
                                        <h3 class="font-medium text-base">{candidate.firstName} {candidate.lastName}</h3>
                                        <Badge variant="outline" class="text-xs">
                                            Interested on {formatDate(candidate.dateInterested)}
                                        </Badge>
                                    </div>
                                    
                                    <div class="flex gap-4 text-sm text-muted-foreground">
                                        <div class="flex items-center gap-1">
                                            <Mail class="h-3.5 w-3.5" />
                                            <span>{candidate.email}</span>
                                        </div>
                                        {#if candidate.phone}
                                        <div class="flex items-center gap-1">
                                            <Phone class="h-3.5 w-3.5" />
                                            <span>{candidate.phone}</span>
                                        </div>
                                        {/if}
                                    </div>
                                </div>
                            </div>
                        </Card.Content>
                    </Card.Root>
                {/each}
            </div>
        {/if}
    </div>
    </div>
        </div>
        </Tabs.Content>
        <Tabs.Content value="questions">
            <div class="bg-blue-50/80 rounded-md p-4">
                <div class="bg-white rounded-md p-4 shadow-sm">
                    <h4 class="text-gray-900 text-xl font-semibold">Context Questions</h4>
                    <p class="text-sm text-muted-foreground mb-6">
                        Questions from candidates are collected here. Once answered, they become part of the context for AI-powered responses in future interactions.
                    </p>
                    <QuestionsInHunt huntId={hunt.huntId} />
                </div>
            </div>
        </Tabs.Content>
      </Tabs.Root>

    
</div>

<!-- If it's a success fee hunt, show the fee information -->
{#if hunt.planType === 'success_fee'}
    <div class="mt-4 p-4 bg-gray-50 rounded-lg">
        <h3 class="text-sm font-medium mb-2">Fee Information</h3>
        {#if hunt.startFee?.amount > 0}
            <p class="text-sm text-gray-600">Start Fee: {hunt.startFee.amount} {hunt.startFee.currency}</p>
        {/if}
        {#if hunt.successFee?.amount > 0}
            <p class="text-sm text-gray-600">Success Fee: {hunt.successFee.amount} {hunt.successFee.currency}</p>
        {/if}
    </div>
{/if}