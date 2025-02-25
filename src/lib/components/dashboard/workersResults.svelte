<script lang="ts">
    import { slide } from 'svelte/transition';
    import { onMount } from 'svelte';
    import { Loader2, CalendarCheck, User, Globe, Briefcase, MapPin, Calendar1, Check, Clock, ArrowRight, ArrowLeft, ChevronRight } from 'lucide-svelte';
    import Button from '@/components/ui/button/button.svelte';
    import * as Card from '$lib/components/ui/card/index.js';
	import type { Candidate, Requirements } from '@/scrubinClient';
	import { scrubinClient } from '@/scrubinClient/client';
	import { toast } from 'svelte-sonner';
    
    // Dummy translations (replace with your localization logic)
    const resultsFound = "Results Found";
    const resultsFoundDesc = "Total matching candidates";
    const talkToSales = "Next step";
    const registrationCountryText = "Registration Country";
    const totalWorkExpText = "Total Work Experience";
    const preferredSpecialityText = "Preferred Speciality";
    const preferredLocationsText = "Preferred Locations";
    const lookingForWorkInText = "Looking for Work in";
    const availabilityText = "Availability";
    const verifiedText = "Verified";
    const recentlyActiveText = "Recently Active";
    const seeMoreText = "See More";
    const moreResultsText = "More results available";
    
    // Flag to show search results (e.g. after a search has been performed)
    
    // Total items count (from API)
    

    let {
        healthcareWorkers = $bindable<Candidate[]>([]),
        totalItems = $bindable(0),
        isSearching = $bindable(false),
        showResults = $bindable(true),
        workerLookupId = $bindable(),
        searchString = $bindable(""),
        requirements = $bindable<Requirements | null>(null)
    }: {
        healthcareWorkers: Candidate[]
        totalItems: number
        isSearching: boolean
        showResults: boolean
        workerLookupId: number | null
        searchString: string
        requirements: Requirements | null
    } = $props();
    
    
    // Carousel logic for desktop (show 3 items at a time)
    let currentIndex = $state(0);
    let isDesktop = $state(false);
    
    onMount(() => {
      const updateWidth = () => {
        isDesktop = window.innerWidth >= 768;
      };
      updateWidth();
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    });
    
    // Compute which items to display on desktop. On mobile, show all.
    let displayedWorkers = $derived(isDesktop 
      ? healthcareWorkers.slice(currentIndex, currentIndex + 3)
      : healthcareWorkers);
    
    function nextSlide() {
      if (currentIndex + 3 < healthcareWorkers.length) {
        currentIndex += 3;
      }
    }
    
    function prevSlide() {
      if (currentIndex - 3 >= 0) {
        currentIndex -= 3;
      }
    }

    // Add loading state for next step button
    let isLoadingNextStep = $state(false);

    async function nextStep() {
        if (workerLookupId) {
            try {
                isLoadingNextStep = true;
                const result = await scrubinClient.hunt.createJobRequirements(workerLookupId);
                requirements = result;
                console.log(result);
            } catch (error) {
                toast.error("Error analyzing requirements: " + error);
                console.error("Error analyzing requirements:", error);
            } finally {
                isLoadingNextStep = false;
            }
        }
    }
  </script>
  
  <div class="flex flex-col gap-2 items-center w-full">
    {#if showResults}
      <div transition:slide class="w-full mt-2">
        {#if !isSearching}
          <!-- Search Results Header - Improved design -->
          <div class="w-full mb-6 bg-white rounded-lg shadow-sm border overflow-hidden">
            <div class="flex flex-col sm:flex-row items-center justify-between w-full">
              <div class="flex-1 p-5 flex items-center gap-4 border-b sm:border-b-0 sm:border-r w-full sm:w-auto">
                <div class="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                  <span class="text-xl font-bold text-blue-600">{totalItems}</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-lg font-semibold text-gray-800">{resultsFound}</span>
                  <span class="text-sm text-gray-500">{resultsFoundDesc}</span>
                </div>
              </div>
              
              {#if healthcareWorkers.length > 0}
              <div class="p-5 w-full sm:w-auto">
                <Button 
                  onclick={nextStep} 
                  class="w-full sm:w-auto" 
                  variant="default"
                  disabled={isLoadingNextStep}
                >
                  {#if isLoadingNextStep}
                    <Loader2 class="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  {:else}
                    {talkToSales}
                    <ChevronRight class="w-4 h-4 ml-2" />
                  {/if}
                </Button>
              </div>
              {/if}
            </div>
          </div>
  
          <!-- Carousel Container -->
          <div class="relative w-full">
            {#if isDesktop && healthcareWorkers.length > 3}
              <!-- Left Arrow -->
              <Button variant="outline" class="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white p-2 rounded-full shadow-md hover:bg-gray-100" 
                disabled={currentIndex === 0}
                onclick={prevSlide}>
                <ArrowLeft class="w-6 h-6 text-gray-700" />
              </Button>
              <!-- Right Arrow -->
               <Button variant="outline" class="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white p-2 rounded-full shadow-md hover:bg-gray-100" 
                disabled={currentIndex + 3 >= healthcareWorkers.length}
                onclick={nextSlide}>
                <ArrowRight class="w-6 h-6 text-gray-700" />
              </Button>
              
            {/if}
            <!-- Worker Cards Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:px-10">
              {#each (isDesktop ? displayedWorkers : healthcareWorkers) as worker}
                <div class="bg-white overflow-hidden flex flex-col hover:shadow-md transition duration-300 ease-in-out">
                  <!-- Card Header -->
                  <div class="flex items-center space-x-4 p-5 border">
                    <div class="w-12 h-12 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center text-blue-500">
                      <User class="w-6 h-6" />
                    </div>
                    <div>
                      {#if worker.professions && worker.professions.length > 0}
                        <h3 class="text-lg font-semibold text-gray-800">{worker.professions.join(', ')}</h3>
                      {/if}
                      {#if worker.speciality && worker.speciality.length > 0}
                        <p class="text-sm text-gray-500">{worker.speciality.join(', ')}</p>
                      {/if}
                    </div>
                  </div>
                  <!-- Card Body -->
                  <div class="p-5 flex-1 flex flex-col space-y-4 text-gray-600 text-sm border-x border-b">
                    {#if worker.professionRegistrationCountry}
                      <div class="flex items-center">
                        <Globe class="w-5 h-5 mr-2 text-gray-500 flex-shrink-0" />
                        <span>{registrationCountryText}: {worker.professionRegistrationCountry}</span>
                      </div>
                    {/if}
                    {#if worker.totalWorkExperience}
                      <div class="flex items-center">
                        <Briefcase class="w-5 h-5 mr-2 text-gray-500 flex-shrink-0" />
                        <span>{totalWorkExpText}: {worker.totalWorkExperience} yrs</span>
                      </div>
                    {/if}
                    {#if worker.preferredSpeciality && worker.preferredSpeciality.length > 0}
                      <div class="flex items-center">
                        <Briefcase class="w-5 h-5 mr-2 text-gray-500 flex-shrink-0" />
                        <span>{preferredSpecialityText}: {worker.preferredSpeciality.join(', ')}</span>
                      </div>
                    {/if}
                    {#if worker.preferredLocations && worker.preferredLocations.length > 0}
                      <div class="flex items-center">
                        <MapPin class="w-5 h-5 mr-2 text-gray-500 flex-shrink-0" />
                        <span>{preferredLocationsText}: {worker.preferredLocations.join(', ')}</span>
                      </div>
                    {/if}
                    {#if worker.countriesLookingForJob && worker.countriesLookingForJob.length > 0}
                      <div class="flex items-center">
                        <Globe class="w-5 h-5 mr-2 text-gray-500 flex-shrink-0" />
                        <span>{lookingForWorkInText}: {worker.countriesLookingForJob.join(', ')}</span>
                      </div>
                    {/if}
                    {#if worker.interestedOffers && worker.interestedOffers.length > 0}
                      <div class="flex items-center">
                        <Calendar1 class="w-5 h-5 mr-2 text-gray-500 flex-shrink-0" />
                        <span>{availabilityText}: {worker.interestedOffers.join(', ')}</span>
                      </div>
                    {/if}
                    {#if worker.top3Terms && worker.top3Terms.length > 0}
                      <div class="flex flex-wrap gap-2">
                        {#each worker.top3Terms as term}
                          <span class="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">{term}</span>
                        {/each}
                      </div>
                    {/if}
                    <div class="flex items-center space-x-4">
                      {#if worker.verified}
                        <div class="flex items-center text-xs bg-green-100 text-green-800 px-2 py-1 rounded-md">
                          <Check class="w-4 h-4 mr-2" />
                          <span>{verifiedText}</span>
                        </div>
                      {/if}
                      {#if worker.recentlyActive}
                        <div class="flex items-center text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-md">
                          <Clock class="w-4 h-4 mr-2" />
                          <span>{recentlyActiveText}</span>
                        </div>
                      {/if}
                    </div>
                  </div>
    
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <div class="flex justify-center items-center h-full">
            <Loader2 class="w-4 h-4 animate-spin" />
          </div>
        {/if}
      </div>
    {/if}
  </div>
  