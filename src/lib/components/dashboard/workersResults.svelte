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
	import SingleWorker from './singleWorker.svelte';
    
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
              <SingleWorker {worker} />
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
  