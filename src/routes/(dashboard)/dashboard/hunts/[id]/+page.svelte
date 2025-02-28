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
        Sparkle
    } from "lucide-svelte";
    import SearchView from "$lib/components/dashboard/searchView.svelte";
	import FunnelChart from "@/components/ui/layer-chart/funnelChart.svelte";
	import SingleWorker from "@/components/dashboard/singleWorker.svelte";
	import { page } from "$app/state";
	import { formatStatus, getStatusColor } from "@/components/payment/payments.js";
	import Separator from "@/components/ui/separator/separator.svelte";

    let { data } = $props();
    let hunt = $derived(data.hunt);


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
</script>

<div class="container mx-auto py-6 space-y-6 max-w-7xl">
    <div class="flex items-center gap-4 mb-6">

            <Button onclick={goToPrevPage} variant="outline" size="icon" class="h-9 w-9">
                <ArrowLeft class="h-4 w-4" />
            </Button>

        <div>
            <h1 class="text-2xl font-bold tracking-tight">{hunt.requirements.jobTitle}</h1>
            <p class="text-sm text-muted-foreground">{hunt.requirements.address.city}, {hunt.requirements.address.stateProvinceRegion}</p>
        </div>
    </div>

    <!-- Status badge at the top -->
    <Tabs.Root bind:value={activeTab} class="w-full">
        <Tabs.List class="grid w-fit grid-cols-2">
          <Tabs.Trigger value="details">Details</Tabs.Trigger>
          <Tabs.Trigger value="statistics">Statistics</Tabs.Trigger>
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
                    <Badge variant="outline" class="px-3 py-1 {getStatusColor(hunt.status)} border-transparent">
                        {formatStatus(hunt.status)}
                    </Badge>
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
  
    <div class="flex flex-col gap-2">
        <p class="text-gray-900 font-semibold text-lg">We're on the Hunt for Great Talent!</p>
        <p class="text-gray-500 text-sm">No interested candidates yet, but we're reaching out to professionals who fit your needs. Check back soon! We'll let you know as soon as we have updates.</p>
    </div>
    </div>
        </div>
        </Tabs.Content>
      </Tabs.Root>

    
</div>