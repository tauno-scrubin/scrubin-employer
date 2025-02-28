<script lang="ts">
    import { slide } from 'svelte/transition';
    import { onMount } from 'svelte';
    import { Loader2, CalendarCheck, User, Globe, Briefcase, MapPin, Calendar1, Check, Clock, ArrowRight, ArrowLeft, ChevronRight, Users, BadgeCheck, CircleHelp, Info } from 'lucide-svelte';
    import Button from '@/components/ui/button/button.svelte';
    import * as Card from '$lib/components/ui/card/index.js';
	import type { Candidate, Requirements } from '@/scrubinClient';
	import { scrubinClient } from '@/scrubinClient/client';
	import { toast } from 'svelte-sonner';
	import { visible } from './overlay';
	import SingleWorker from './singleWorker.svelte';
    
    // Dummy translations (replace with your localization logic)
    let MAX_SELECTED_WORKERS = 10;
    const moreResultsText = "More results available";
    
    let {
        healthcareWorkers = $bindable<Candidate[]>([]),
        totalItems = $bindable(0),
        isSearching = $bindable(false),
        showResults = $bindable(true),
        workerLookupId = $bindable(),
        searchString = $bindable(""),
        requirements = $bindable<Requirements | null>(null),
        selectedWorkers = $bindable<Record<string, boolean>>({})
    }: {
        healthcareWorkers: Candidate[]
        totalItems: number
        isSearching: boolean
        showResults: boolean
        workerLookupId: number | null
        searchString: string
        requirements: Requirements | null
        selectedWorkers: Record<string, boolean>
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

    let canNotSelectMoreWorkers = $derived(Object.values(selectedWorkers).filter(Boolean).length >= MAX_SELECTED_WORKERS);
    let selectedWorkersCount = $derived(Object.values(selectedWorkers).filter(Boolean).length);
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


    

  </script>

<div class="fixed bottom-4 left-1/2 sm:left-[55vw] -translate-x-1/2 flex items-center px-3 py-1.5 bg-gray-100/60 backdrop-blur-sm rounded-full text-sm font-medium z-10">
  <User class="w-4 h-4 mr-1.5 text-primary" />
  <span>{selectedWorkersCount}/{MAX_SELECTED_WORKERS} selected</span>
</div>
  
  <div class="flex flex-col gap-2 items-center w-full mb-2 pb-7">
    {#if showResults}
      <div transition:slide class="w-full mt-2">
        {#if !isSearching}
          <!-- Search Results Header - Improved design -->
          
          <!-- Carousel Navigation -->
          {#if healthcareWorkers.length > 3}
          <div class="flex items-center justify-between gap-2 mb-3">
            <p class="text-sm text-blue-500  p-2 border rounded-md bg-blue-50/50 border-blue-500 flex items-center gap-2">
              <Info class="w-4 h-4 flex-shrink-0" />
              Select up to 10 favorite profiles to refine your recommendations. This helps us understand your preferences and suggest similar candidates that best match your needs!</p>
            <div class="flex items-center justify-end gap-2">
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
          </div>
          {/if}
          
          <!-- Worker Cards Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {#each (isDesktop ? displayedWorkers : healthcareWorkers) as worker, i (worker.id)}
              <SingleWorker 
                {worker} 
                allowSelection={true} 
                disabled={canNotSelectMoreWorkers}
                checked={selectedWorkers[worker.id]}
                onSelect={(worker) => {
                  selectedWorkers[worker.id] = !selectedWorkers[worker.id];
                }}
              />
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
  