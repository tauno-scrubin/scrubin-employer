<script lang="ts">
    import { slide } from 'svelte/transition';
    import { onMount } from 'svelte';
    import { Loader2, CalendarCheck, User, Globe, Briefcase, MapPin, Calendar1, Check, Clock, ArrowRight, ArrowLeft, ChevronRight, Users, BadgeCheck } from 'lucide-svelte';
    import Button from '@/components/ui/button/button.svelte';
    import * as Card from '$lib/components/ui/card/index.js';
	import type { Candidate, Requirements } from '@/scrubinClient';
	import { scrubinClient } from '@/scrubinClient/client';
	import { toast } from 'svelte-sonner';
	import { visible } from './overlay';
    
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


  </script>
  
  <div class="flex flex-col gap-2 items-center w-full mb-2">
    {#if showResults}
      <div transition:slide class="w-full mt-2">
        {#if !isSearching}
          <!-- Search Results Header - Improved design -->
          
          <!-- Carousel Navigation -->
          {#if isDesktop && healthcareWorkers.length > 3}
            <div class="flex items-center justify-end gap-2 mb-3">
              <Button 
                variant="outline" 
                size="icon" 
                class="h-9 w-9 rounded-full border-gray-200 hover:bg-gray-100 hover:text-primary transition-all duration-200" 
                disabled={currentIndex === 0}
                onclick={prevSlide}
              >
                <ArrowLeft class="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                class="h-9 w-9 rounded-full border-gray-200 hover:bg-gray-100 hover:text-primary transition-all duration-200" 
                disabled={currentIndex + 3 >= healthcareWorkers.length}
                onclick={nextSlide}
              >
                <ArrowRight class="w-4 h-4" />
              </Button>
            </div>
          {/if}
          
          <!-- Worker Cards Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {#each (isDesktop ? displayedWorkers : healthcareWorkers) as worker}
              <Card.Root class="overflow-hidden hover:shadow-md transition-all duration-300 border border-gray-200 h-full">
                <!-- Card Header -->
                <Card.Header class="p-4 pb-3 border-b bg-white">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                      <User class="w-5 h-5" />
                    </div>
                    <div>
                      {#if worker.professions && worker.professions.length > 0}
                        <h3 class="text-base font-semibold text-gray-800">{worker.professions.join(', ')}</h3>
                      {/if}
                      {#if worker.speciality && worker.speciality.length > 0}
                        <p class="text-xs text-gray-500">{worker.speciality.join(', ')}</p>
                      {/if}
                    </div>
                  </div>
                </Card.Header>
                
                <!-- Card Body -->
                <Card.Content class="p-4 flex flex-col space-y-3 text-gray-600 text-sm bg-white">
                  {#if worker.professionRegistrationCountry}
                    <div class="flex items-center">
                      <Globe class="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                      <span class="text-xs">{registrationCountryText}: <span class="font-medium text-gray-700">{worker.professionRegistrationCountry}</span></span>
                    </div>
                  {/if}
                  
                  {#if worker.totalWorkExperience}
                    <div class="flex items-center">
                      <Briefcase class="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                      <span class="text-xs">{totalWorkExpText}: <span class="font-medium text-gray-700">{worker.totalWorkExperience} yrs</span></span>
                    </div>
                  {/if}
                  
                  {#if worker.preferredSpeciality && worker.preferredSpeciality.length > 0}
                    <div class="flex items-start">
                      <Briefcase class="w-4 h-4 mr-2 text-gray-400 flex-shrink-0 mt-0.5" />
                      <span class="text-xs">{preferredSpecialityText}: <span class="font-medium text-gray-700">{worker.preferredSpeciality.join(', ')}</span></span>
                    </div>
                  {/if}
                  
                  {#if worker.preferredLocations && worker.preferredLocations.length > 0}
                    <div class="flex items-start">
                      <MapPin class="w-4 h-4 mr-2 text-gray-400 flex-shrink-0 mt-0.5" />
                      <span class="text-xs">{preferredLocationsText}: <span class="font-medium text-gray-700">{worker.preferredLocations.join(', ')}</span></span>
                    </div>
                  {/if}
                  
                  {#if worker.countriesLookingForJob && worker.countriesLookingForJob.length > 0}
                    <div class="flex items-start">
                      <Globe class="w-4 h-4 mr-2 text-gray-400 flex-shrink-0 mt-0.5" />
                      <span class="text-xs">{lookingForWorkInText}: <span class="font-medium text-gray-700">{worker.countriesLookingForJob.join(', ')}</span></span>
                    </div>
                  {/if}
                  
                  {#if worker.interestedOffers && worker.interestedOffers.length > 0}
                    <div class="flex items-start">
                      <Calendar1 class="w-4 h-4 mr-2 text-gray-400 flex-shrink-0 mt-0.5" />
                      <span class="text-xs">{availabilityText}: <span class="font-medium text-gray-700">{worker.interestedOffers.join(', ')}</span></span>
                    </div>
                  {/if}
                </Card.Content>
                
                <Card.Footer class="p-4 pt-0 bg-white w-full flex flex-col gap-2">
                  {#if worker.top3Terms && worker.top3Terms.length > 0}
                    <div class="flex flex-wrap gap-1.5  w-full items-center">
                      {#each worker.top3Terms as term}
                        <span class="px-2 py-0.5 text-xs bg-blue-50 text-blue-800 rounded-full">{term}</span>
                      {/each}
                    </div>
                  {/if}
                  
                  <div class="flex  gap-2  w-full items-center">
                    {#if worker.verified}
                      <div class="flex items-center text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
                        <BadgeCheck class="w-3 h-3 mr-1" />
                        <span>{verifiedText}</span>
                      </div>
                    {/if}
                    {#if worker.recentlyActive}
                      <div class="flex items-center text-xs bg-blue-50 text-blue-800 px-2 py-1 rounded-full">
                        <Clock class="w-3 h-3 mr-1" />
                        <span>{recentlyActiveText}</span>
                      </div>
                    {/if}
                  </div>
                </Card.Footer>
              </Card.Root>
            {/each}
          </div>
          
          <!-- Pagination indicator for mobile -->
          {#if !isDesktop && healthcareWorkers.length > 3}
            <div class="flex justify-center mt-6">
              <span class="text-xs text-gray-500">{moreResultsText}</span>
            </div>
          {/if}
        {:else}
          <div class="flex justify-center items-center h-40">
            <Loader2 class="w-8 h-8 animate-spin text-primary" />
          </div>
        {/if}
      </div>
    {/if}
  </div>
  