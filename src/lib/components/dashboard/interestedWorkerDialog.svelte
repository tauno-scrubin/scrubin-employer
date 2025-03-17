<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import * as Tabs from "$lib/components/ui/tabs/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import type { InterestedCandidateDetails } from "@/scrubinClient";
    import { scrubinClient } from "@/scrubinClient/client";
    import { Heart, Sparkle, MessageCircle, Calendar, Phone, Mail, Briefcase, GraduationCap, Award } from "lucide-svelte";
    import Button from "../ui/button/button.svelte";
	import CandidateChat from "./candidateChat.svelte";
	import CandidateNotes from "./candidateNotes.svelte";

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

    function formatDateTime(dateString: string): string {
        try {
            const date = new Date(dateString);
            const datePart = date.toLocaleDateString('en-US', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
            });
            const timePart = date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
            return `${datePart} at ${timePart}`;
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
            <Tabs.Root value="profile" class="w-full">
                <Tabs.List class="grid w-full grid-cols-3">
                    <Tabs.Trigger value="profile">Profile</Tabs.Trigger>
                    <Tabs.Trigger value="messages">Messages</Tabs.Trigger>
                    <Tabs.Trigger value="notes">Notes</Tabs.Trigger>
                </Tabs.List>
                
                <Tabs.Content value="profile">
                    <Card.Root>
                        <Card.Content class="pt-6">
                            {#if worker.dateInterview}
                            <div class="flex text-sm items-center mb-2 gap-2 col-span-full bg-green-50 p-2 rounded-md border border-green-200">
                                <Calendar class="w-4 h-4 text-green-600" />
                                <span class="text-green-800 font-medium">
                                    Interview booked for {formatDateTime(worker.dateInterview)}
                                </span>
                            </div>
                            {/if}

                            <div class="mb-6 p-4 bg-blue-50 rounded-md shadow-sm">
                                <h2 class="text-xl font-medium mb-4 flex items-center">
                                    <Sparkle fill="currentColor" strokeWidth={1} class="w-5 h-5 text-blue-500 mr-2" />
                                    Contact Information
                                </h2>
                                
                                <div class="grid grid-cols-1 gap-4">
                                    <div class="flex items-center gap-3 mb-2">
                                        <div class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-lg">
                                            {worker.firstName?.[0]}{worker.lastName?.[0]}
                                        </div>
                                        <span class="text-gray-900 font-semibold text-lg">{worker.firstName} {worker.lastName}</span>
                                    </div>
                                    
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 pl-1">
                                        <div class="flex items-center gap-3 group hover:bg-blue-50 rounded-md transition-colors">
                                            <div class="bg-blue-50 p-2 rounded-full">
                                                <Mail class="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div class="flex flex-col">
                                                <span class="text-xs text-gray-500">Email</span>
                                                <a href={`mailto:${worker.email}`} class="text-gray-700 group-hover:text-blue-700 transition-colors text-sm">
                                                    {worker.email}
                                                </a>
                                            </div>
                                        </div>
                                        
                                        <div class="flex items-center gap-3 group hover:bg-blue-50 rounded-md transition-colors">
                                            <div class="bg-blue-50 p-2 rounded-full">
                                                <Phone class="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div class="flex flex-col">
                                                <span class="text-xs text-gray-500">Phone</span>
                                                <a href={`tel:${worker.phone}`} class="text-gray-700 group-hover:text-blue-700 transition-colors text-sm">
                                                    {worker.phone}
                                                </a>
                                            </div>
                                            
                                        </div>
                                        
                                        <div class="flex items-center gap-3 group rounded-md md:col-span-2">
                                            <div class="bg-blue-50 p-2 rounded-full">
                                                <Calendar class="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div class="flex flex-col">
                                                <span class="text-xs text-gray-500">Interested since</span>
                                                <span class="text-gray-700 text-sm">{formatDate(worker.dateInterested)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {#if worker.professionNumbers && worker.professionNumbers.length > 0}
                                        <div class="mt-3 border-t pt-3">
                                            <h4 class="font-medium text-gray-700 mb-2 text-sm">Professional Registration:</h4>
                                            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {#each worker.professionNumbers as registration}
                                                    <div class="flex items-center gap-2 rounded-md">
                                                        <span class="text-xs font-medium text-gray-500">{registration.countryRegistered}:</span>
                                                        <span class="text-sm text-gray-700">{registration.number}</span>
                                                    </div>
                                                {/each}
                                            </div>
                                        </div>
                                    {/if}
                                </div>
                            </div>
                            
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
                                    </div>
                                </div>
                                
                                <div class="border-t pt-3">
                                    <h4 class="text-xl font-medium mb-4">Additional Information</h4>
                                    
                                    {#if worker.userDesc}
                                        <div class="mb-4">
                                            <h5 class="font-semibold mb-2">About</h5>
                                            <p class="text-gray-700 text-sm">{worker.userDesc}</p>
                                        </div>
                                    {/if}
                                    
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
                                                            {formatDate(experience.start)} - {experience.end ? formatDate(experience.end) : 'Present'}
                                                        </div>
                                                        <div class="text-sm mt-1">{experience.desc}</div>
                                                    </div>
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
                                                            {formatDate(training.date)}
                                                        </div>
                                                        <div class="text-sm mt-1">{training.description}</div>
                                                    </div>
                                                {/each}
                                            </div>
                                        </div>
                                    {/if}
                                    
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <h5 class="font-semibold mb-2">Other Skills</h5>
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
                                        
                                        <div>
                                            <h5 class="font-semibold mb-2">Soft Skills</h5>
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
                                    </div>
                                </div>
                            </div>
                        </Card.Content>
                    </Card.Root>
                </Tabs.Content>
                
                <Tabs.Content value="messages">
                    <CandidateChat bind:huntId={huntId} bind:candidateId={candidateId} />
                </Tabs.Content>
                
                <Tabs.Content value="notes">
                    <CandidateNotes bind:huntId={huntId} bind:candidateId={candidateId} bind:notes={worker.notes} />
                </Tabs.Content>
            </Tabs.Root>
        {:else}
            <div class="p-4 text-center text-gray-500">
                No candidate data available.
            </div>
        {/if}
    </Dialog.Content>
</Dialog.Root>
