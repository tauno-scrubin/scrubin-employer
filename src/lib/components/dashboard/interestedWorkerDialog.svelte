<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import type { InterestedCandidateDetails } from "@/scrubinClient";
    import { scrubinClient } from "@/scrubinClient/client";
    import { Heart, Sparkle, MessageCircle, Calendar, Phone, Mail } from "lucide-svelte";
    import Button from "../ui/button/button.svelte";

    let {
        open = $bindable(false),
        huntId = $bindable(0),
        candidateId = $bindable(0),
    }: {
        open: boolean,
        huntId: number,
        candidateId: number,
    } = $props();

    let worker: InterestedCandidateDetails | null = $state(null);
    let isLoading = $state(false);
    let hasError = $state(false);
    let activeTab = $state("profile"); // profile, messages, notes

    $effect(() => {
        if (open && huntId && candidateId) {
            getWorker();
        }
    })

    async function getWorker() {
        isLoading = true;
        hasError = false;
        try {
            // Assuming there's an API endpoint for interested candidates
            const response = await scrubinClient.hunt.getInterestedCandidateDetails(huntId, candidateId);
            worker = response;
        } catch (error) {
            console.error("Error fetching interested worker data:", error);
            hasError = true;
        } finally {
            isLoading = false;
        }
    }

    function formatDate(dateString: string): string {
        try {
            return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch (e) {
            return dateString || 'Not available';
        }
    }
</script>
    
<Dialog.Root bind:open>
    <Dialog.Content class="max-w-3xl max-h-[90vh] overflow-y-auto">
        <Dialog.Header>
            <Dialog.Title class="flex items-center gap-2 justify-between">
                Interested Candidate
            </Dialog.Title>
            <Dialog.Description>
                Candidate who has expressed interest
            </Dialog.Description>
        </Dialog.Header>
        
        {#if isLoading}
            <div class="flex justify-center items-center p-8">
                <div class="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
        {:else if hasError}
            <div class="p-4 text-center text-red-500">
                Failed to load candidate data. Please try again.
            </div>
        {:else if worker}
            <!-- Tab Navigation -->
            <div class="flex border-b mb-4">
                <button 
                    class="px-4 py-2 font-medium {activeTab === 'profile' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}"
                    onclick={() => activeTab = 'profile'}
                >
                    Profile
                </button>
                <button 
                    class="px-4 py-2 font-medium {activeTab === 'messages' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}"
                    onclick={() => activeTab = 'messages'}
                >
                    Messages
                </button>
                <button 
                    class="px-4 py-2 font-medium {activeTab === 'notes' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}"
                    onclick={() => activeTab = 'notes'}
                >
                    Notes
                </button>
            </div>

            {#if activeTab === 'profile'}
                <div class="bg-white rounded-md">
                    <!-- Contact Information Section -->
                    <div class="mb-6 p-4 bg-blue-50 rounded-md">
                        <h2 class="text-xl font-medium mb-4 flex items-center">
                            <Sparkle fill="currentColor" strokeWidth={1} class="w-5 h-5 text-blue-500 mr-2" />
                            Contact Information
                        </h2>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="flex items-center gap-2">
                                <span class="font-semibold">Name:</span>
                                <span>{worker.firstName} {worker.lastName}</span>
                            </div>
                            
                            <div class="flex items-center gap-2">
                                <Mail class="w-4 h-4 text-gray-500" />
                                <a href={`mailto:${worker.email}`} class="text-blue-600 hover:underline">{worker.email}</a>
                            </div>
                            
                            <div class="flex items-center gap-2">
                                <Phone class="w-4 h-4 text-gray-500" />
                                <a href={`tel:${worker.phone}`} class="text-blue-600 hover:underline">{worker.phone}</a>
                            </div>
                            
                            <div class="flex items-center gap-2">
                                <Calendar class="w-4 h-4 text-gray-500" />
                                <span>Interested since: {formatDate(worker.dateInterested)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Worker Information Section -->
                    <div class="space-y-3">
                        <div class="grid grid-cols-1 gap-4 text-sm border-b pb-3">
                            <div class="w-full grid grid-cols-[150px_1fr] items-start">
                                <h4 class="font-semibold">Professions</h4>
                                <div class="flex flex-row gap-2 flex-wrap">
                                    {#if worker.professions && worker.professions.length > 0}
                                        {#each worker.professions as profession}
                                            <span class="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">{profession}</span>
                                        {/each}
                                    {:else}
                                        <p class="text-gray-500">Not specified</p>
                                    {/if}
                                </div>
                            </div>
                            
                            <div class="w-full grid grid-cols-[150px_1fr] items-start">
                                <h4 class="font-semibold">Registration Country</h4>
                                <p class="{worker.professionRegistrationCountry ? 'text-gray-900' : 'text-gray-500'}">
                                    {worker.professionRegistrationCountry || 'Not specified'}
                                </p>
                            </div>
                        </div>
                        
                        <div class="grid grid-cols-1 gap-4 text-sm">
                            <div class="w-full grid grid-cols-[150px_1fr] items-start">
                                <h4 class="font-semibold">Speciality</h4>
                                <div class="flex flex-row gap-2 flex-wrap">
                                    {#if worker.speciality && worker.speciality.length > 0}
                                        {#each worker.speciality as spec}
                                            <span class="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">{spec}</span>
                                        {/each}
                                    {:else}
                                        <p class="text-gray-500">Not specified</p>
                                    {/if}
                                </div>
                            </div>
                            
                            <div class="w-full grid grid-cols-[150px_1fr] items-start">
                                <h4 class="font-semibold">Activity Status</h4>
                                <p class="text-gray-900">
                                    {worker.recentlyActive ? 'Recently active' : 'Not recently active'}
                                </p>
                            </div>
                            
                            <div class="w-full grid grid-cols-[150px_1fr] items-start">
                                <h4 class="font-semibold">Verified</h4>
                                <p class="text-gray-900">
                                    {worker.verified ? 'Verified' : 'Not verified'}
                                </p>
                            </div>
                            
                            <div class="w-full grid grid-cols-[150px_1fr] items-start">
                                <h4 class="font-semibold">Verifications</h4>
                                <div class="flex flex-row gap-2 flex-wrap">
                                    {#if worker.verifications && worker.verifications.length > 0}
                                        {#each worker.verifications as verification}
                                            <span class="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">{verification}</span>
                                        {/each}
                                    {:else}
                                        <p class="text-gray-500">Not specified</p>
                                    {/if}
                                </div>
                            </div>
                            
                            <div class="w-full grid grid-cols-[150px_1fr] items-start">
                                <h4 class="font-semibold">Work Experience</h4>
                                <p class="text-gray-900">{worker.totalWorkExperience || 0} years</p>
                            </div>
                            
                            <div class="w-full grid grid-cols-[150px_1fr] items-start">
                                <h4 class="font-semibold">Languages</h4>
                                <div class="flex flex-row gap-2 flex-wrap">
                                    {#if worker.languages && worker.languages.length > 0}
                                        {#each worker.languages as language}
                                            <span class="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">{language}</span>
                                        {/each}
                                    {:else}
                                        <p class="text-gray-500">Not specified</p>
                                    {/if}
                                </div>
                            </div>
                        </div>
                        
                        <!-- Job Preferences Section -->
                        <div class="border-t pt-3 mt-4">
                            <h4 class="text-xl font-medium mb-4">Job Preferences</h4>
                            
                            <div class="grid grid-cols-1 gap-4 text-sm">
                                <!-- Job preferences content from singleWorkerDialog -->
                                <div class="w-full grid grid-cols-[150px_1fr] items-start">
                                    <h4 class="font-semibold">Countries</h4>
                                    <div class="flex flex-row gap-2 flex-wrap">
                                        {#if worker.countriesLookingForJob && worker.countriesLookingForJob.length > 0}
                                            {#each worker.countriesLookingForJob as country}
                                                <span class="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">{country}</span>
                                            {/each}
                                        {:else}
                                            <p class="text-gray-500">Not specified</p>
                                        {/if}
                                    </div>
                                </div>
                                
                                <!-- Additional job preferences fields -->
                                <!-- ... existing job preferences fields ... -->
                            </div>
                        </div>
                        
                        <!-- Additional Information Section -->
                        <div class="border-t pt-3">
                            <h4 class="text-xl font-medium mb-4">Additional Information</h4>
                            
                            <div class="grid grid-cols-1 gap-4 text-sm">
                                <!-- ... existing additional information fields ... -->
                            </div>
                        </div>
                    </div>
                </div>
            {:else if activeTab === 'messages'}
                <div class="bg-white rounded-md p-4">
                    <h2 class="text-xl font-medium mb-4 flex items-center">
                        <MessageCircle class="w-5 h-5 text-blue-500 mr-2" />
                        Message History
                    </h2>
                    
                    {#if worker.conservation && worker.conservation.length > 0}
                        <div class="space-y-4">
                            {#each worker.conservation as message}
                                <div class="p-3 rounded-lg {message.sentByMe ? 'bg-blue-50 ml-8' : 'bg-gray-50 mr-8'}">
                                    <div class="flex justify-between items-center mb-1">
                                        <span class="font-medium">{message.sentByMe ? 'You' : 'Candidate'}</span>
                                        <div class="flex flex-col items-end">
                                            <span class="text-xs text-gray-500">{formatDate(message.date)}</span>
                                            {#if message.dateRead}
                                                <span class="text-xs text-gray-400">Read {formatDate(message.dateRead)}</span>
                                            {/if}
                                        </div>
                                    </div>
                                    <p class="text-gray-700">{message.message}</p>
                                </div>
                            {/each}
                        </div>
                    {:else}
                        <p class="text-gray-500 text-center py-8">No message history available.</p>
                    {/if}
                    
                    <!-- Message input area could be added here -->
                </div>
            {:else if activeTab === 'notes'}
                <div class="bg-white rounded-md p-4">
                    <h2 class="text-xl font-medium mb-4">Internal Notes</h2>
                    
                    {#if worker.internalNotes && worker.internalNotes.length > 0}
                        <div class="space-y-4">
                            {#each worker.internalNotes as note}
                                <div class="p-3 border rounded-lg">
                                    <div class="flex justify-between items-center mb-2">
                                        <span class="font-medium">{note.creatorName}</span>
                                        <span class="text-xs text-gray-500">{formatDate(note.date)}</span>
                                    </div>
                                    <p class="text-gray-700">{note.note}</p>
                                </div>
                            {/each}
                        </div>
                    {:else}
                        <p class="text-gray-500 text-center py-8">No internal notes available.</p>
                    {/if}
                    
                    <!-- Note input area could be added here -->
                </div>
            {/if}
        {:else}
            <div class="p-4 text-center text-gray-500">
                No candidate data available.
            </div>
        {/if}
    </Dialog.Content>
</Dialog.Root>
