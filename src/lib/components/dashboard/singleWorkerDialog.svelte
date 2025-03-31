<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog/index.js";
	import type { HuntableDetails } from "@/scrubinClient";
	import { scrubinClient } from "@/scrubinClient/client";
    import { Heart, Sparkle, Briefcase, GraduationCap, Award } from "lucide-svelte";
	import Button from "../ui/button/button.svelte";

    let {
        open = $bindable(false),
        lookupId = $bindable(0),
        huntableId = $bindable(0),
        allowSelection = $bindable(false),
        onSelect = $bindable(() => {}),
        huntableSelected = $bindable(),
    }: {
        open: boolean,
        lookupId: number,
        huntableId: number,
        allowSelection: boolean,
        onSelect: (huntableId: number) => void,
        huntableSelected: boolean,
    } = $props();

    let worker: HuntableDetails | null = $state(null);
    let isLoading = $state(false);
    let hasError = $state(false);

    $effect(() => {
        if (open && lookupId && huntableId) {
            getWorker();
        }
    })

    async function getWorker() {
        isLoading = true;
        hasError = false;
        try {
            const response = await scrubinClient.hunt.getHuntableDetails(lookupId.toString(), huntableId.toString());
            worker = response;
        } catch (error) {
            console.error("Error fetching worker data:", error);
            hasError = true;
        } finally {
            isLoading = false;
        }
    }
</script>
    
<Dialog.Root bind:open>
    <Dialog.Content class="max-w-3xl max-h-[90vh] overflow-y-auto ">
        
        {#if isLoading}
            <div class="flex justify-center items-center p-8">
                <div class="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
        {:else if hasError}
            <div class="p-4 text-center text-red-500">
                Failed to load worker data. Please try again.
            </div>
        {:else if worker}
            <div class="  bg-white rounded-md">
                <Sparkle fill="currentColor" strokeWidth={1} class="w-8 h-8 text-blue-500 mb-4 rotate-45" />
                <h2 class="text-xl font-medium mb-4 flex flex-row gap-2 justify-between">Worker Information 

                    {#if allowSelection}
                    <Button onclick={() => onSelect(huntableId)} variant="ghost" size="icon" class="p-1 rounded-full disabled:cursor-not-allowed text-gray-400 hover:text-gray-600" >
                        <Heart fill={huntableSelected ? 'currentColor' : 'none'} class="w-4 h-4 {huntableSelected ? 'text-red-500' : 'text-gray-400'}" />
                    </Button>
                {/if}
                </h2>
                
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

                    <!-- Work Experience Section -->
                    <div class="border-t pt-3 mt-4">
                        <h4 class="text-xl font-medium mb-4">Experience</h4>

                        {#if worker.workExperiences && worker.workExperiences.length > 0}
                            <div class="mb-4">
                                <h5 class="font-semibold mb-2 flex items-center">
                                    <Briefcase class="w-4 h-4 mr-1" /> Work Experience
                                </h5>
                                <div class="space-y-3">
                                    {#each worker.workExperiences as experience}
                                        <div class="border-l-2 border-blue-200 pl-3 py-1">
                                            <div class="font-medium">{experience.company}</div>
                                            <div class="text-sm text-gray-600">
                                                {new Date(experience.start).toLocaleDateString('en-US', {year: 'numeric', month: 'short'})} - 
                                                {experience.end ? new Date(experience.end).toLocaleDateString('en-US', {year: 'numeric', month: 'short'}) : 'Present'}
                                            </div>
                                            <div class="text-sm mt-1">{experience.desc}</div>
                                        </div>
                                        {:else}
                            <p class="text-gray-500">No work experience listed</p>
                                    {/each}
                                </div>
                            </div>
                        
                        {/if}
                        
                        {#if worker.educations && worker.educations.length > 0}
                            <div class="mb-4">
                                <h5 class="font-semibold mb-2 flex items-center">
                                    <GraduationCap class="w-4 h-4 mr-1" /> Education
                                </h5>
                                <div class="space-y-3">
                                    {#each worker.educations as education}
                                        <div class="border-l-2 border-blue-200 pl-3 py-1">
                                            <div class="font-medium">{education.school}</div>
                                            <div class="text-sm text-gray-600">
                                                {education.speciality}
                                            </div>
                                            <div class="text-sm text-gray-600">
                                                {education.startYear} - {education.endYear || 'Present'}
                                            </div>
                                        </div>
                                        {:else}
                                        <p class="text-gray-500">No education listed</p>
                                    {/each}
                                </div>
                            </div>
                     
                        {/if}
                        
                        {#if worker.trainings && worker.trainings.length > 0}
                            <div class="mb-4">
                                <h5 class="font-semibold mb-2 flex items-center">
                                    <Award class="w-4 h-4 mr-1" /> Trainings & Certifications
                                </h5>
                                <div class="space-y-3">
                                    {#each worker.trainings as training}
                                        <div class="border-l-2 border-blue-200 pl-3 py-1">
                                            <div class="font-medium">{training.name}</div>
                                            <div class="text-sm text-gray-600">
                                                {new Date(training.date).toLocaleDateString('en-US', {year: 'numeric', month: 'short'})}
                                            </div>
                                            <div class="text-sm mt-1">{training.description}</div>
                                        </div>
                                        {:else}
                            <p class="text-gray-500">No trainings or certifications listed</p>
                                    {/each}
                                </div>
                            </div>
                        
                        {/if}
                    </div>
                    
                    <div class="border-t pt-3 mt-4">
                        <h4 class="text-xl font-medium mb-4">Job Preferences</h4>
                        
                        <div class="grid grid-cols-1 gap-4 text-sm">
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
                            
                            <div class="w-full grid grid-cols-[150px_1fr] items-start">
                                <h4 class="font-semibold">Preferred Locations</h4>
                                <div class="flex flex-row gap-2 flex-wrap">
                                    {#if worker.preferredLocations && worker.preferredLocations.length > 0}
                                        {#each worker.preferredLocations as location}
                                            <span class="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">{location}</span>
                                        {/each}
                                    {:else}
                                        <p class="text-gray-500">Not specified</p>
                                    {/if}
                                </div>
                            </div>
                            
                            <div class="w-full grid grid-cols-[150px_1fr] items-start">
                                <h4 class="font-semibold">Preferred Speciality</h4>
                                <div class="flex flex-row gap-2 flex-wrap">
                                    {#if worker.preferredSpeciality && worker.preferredSpeciality.length > 0}
                                        {#each worker.preferredSpeciality as speciality}
                                            <span class="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">{speciality}</span>
                                        {/each}
                                    {:else}
                                        <p class="text-gray-500">Not specified</p>
                                    {/if}
                                </div>
                            </div>
                            
                            <div class="w-full grid grid-cols-[150px_1fr] items-start">
                                <h4 class="font-semibold">Facility Types</h4>
                                <div class="flex flex-row gap-2 flex-wrap">
                                    {#if worker.preferredFacilityTypes && worker.preferredFacilityTypes.length > 0}
                                        {#each worker.preferredFacilityTypes as facilityType}
                                            <span class="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">{facilityType}</span>
                                        {/each}
                                    {:else}
                                        <p class="text-gray-500">Not specified</p>
                                    {/if}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="border-t pt-3">
                        <h4 class="text-xl font-medium mb-4">Additional Information</h4>
                        
                        <div class="grid grid-cols-1 gap-4 text-sm">
                            <div class="w-full grid grid-cols-[150px_1fr] items-start">
                                <h4 class="font-semibold">Soft Skills</h4>
                                <div class="flex flex-row gap-2 flex-wrap">
                                    {#if worker.softSkills && worker.softSkills.length > 0}
                                        {#each worker.softSkills as skill}
                                            <span class="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">{skill}</span>
                                        {/each}
                                    {:else}
                                        <p class="text-gray-500">Not specified</p>
                                    {/if}
                                </div>
                            </div>

                            <div class="w-full grid grid-cols-[150px_1fr] items-start">
                                <h4 class="font-semibold">Other Skills</h4>
                                <div class="flex flex-row gap-2 flex-wrap">
                                    {#if worker.otherSkills && worker.otherSkills.length > 0}
                                        {#each worker.otherSkills as skill}
                                            <span class="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">{skill}</span>
                                        {/each}
                                    {:else}
                                        <p class="text-gray-500">Not specified</p>
                                    {/if}
                                </div>
                            </div>


                            <div class="w-full grid grid-cols-[150px_1fr] items-start">
                                <h4 class="font-semibold">Interested Offers</h4>
                                <div class="flex flex-row gap-2 flex-wrap">
                                    {#if worker.interestedOffers && worker.interestedOffers.length > 0}
                                        {#each worker.interestedOffers as offer}
                                            <span class="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">{offer}</span>
                                        {/each}
                                    {:else}
                                        <p class="text-gray-500">Not specified</p>
                                    {/if}
                                </div>
                            </div>
                            
                            <div class="w-full grid grid-cols-[150px_1fr] items-start">
                                <h4 class="font-semibold">Top 3 Terms</h4>
                                <div class="flex flex-row gap-2 flex-wrap">
                                    {#if worker.top3Terms && worker.top3Terms.length > 0}
                                        {#each worker.top3Terms as term}
                                            <span class="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">{term}</span>
                                        {/each}
                                    {:else}
                                        <p class="text-gray-500">Not specified</p>
                                    {/if}
                                </div>
                            </div>
                            
                            <div class="w-full grid grid-cols-[150px_1fr] items-start">
                                <h4 class="font-semibold">About</h4>
                                <p class="{worker.userDesc ? 'text-gray-900' : 'text-gray-500'}">
                                    {worker.userDesc || 'Not specified'}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                </div>
            </div>
        {:else}
            <div class="p-4 text-center text-gray-500">
                No worker data available.
            </div>
        {/if}

    </Dialog.Content>
</Dialog.Root>