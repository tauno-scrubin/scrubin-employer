<script lang="ts">
  import * as Card from "$lib/components/ui/card";
	import type { Candidate } from "@/scrubinClient";
  import { Checkbox } from "$lib/components/ui/checkbox/index.js";
  import { User, Briefcase, MapPin, Globe, Calendar1, BadgeCheck, Clock, Check, Percent, Languages, Heart } from "lucide-svelte";
	import Button from "../ui/button/button.svelte";

  let { worker, status, allowSelection, checked = $bindable(), onSelect, disabled = $bindable() } : { worker: Candidate, status?: string, allowSelection?: boolean, checked?: boolean, onSelect?: (worker: Candidate) => void, disabled?: boolean} = $props();

  function toggleSelection() {
    if (!disabl) {
      onSelect?.(worker);
    }
  }

  let disabl = $derived(allowSelection && disabled && !checked)

</script>


<Card.Root onclick={toggleSelection} class="overflow-hidden {allowSelection ? 'cursor-pointer' : 'cursor-default'} {disabl ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} hover:shadow-md transition-all duration-300 border border-gray-200 h-full justify-start flex flex-col">
    <!-- Card Header -->
    <Card.Header class="p-4 pb-3 border-b bg-white relative">
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
        {#if allowSelection}
        <div class="absolute top-2 right-2">
          <Button disabled={disabled && !checked} variant="ghost" size="icon" class="p-1 rounded-full disabled:cursor-not-allowed">
            <Heart fill={checked ? 'currentColor' : 'none'} class="w-4 h-4  {checked ? 'text-red-500' : 'text-gray-400'} " />
          </Button>
          </div>
        {/if}
      </div>
    </Card.Header>
    
    <!-- Card Body -->
    <Card.Content class="p-4 flex flex-col space-y-3 text-gray-600 text-sm bg-white">



     
        <div class="flex items-center">
          <Globe class="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
          <span class="text-xs">Registration Country: <span class="font-medium text-gray-700">{worker.professionRegistrationCountry || 'Not specified'}</span></span>
        </div>


      {#if worker.languages && worker.languages.length > 0}
        <div class="flex items-center">
          <Languages class="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
          <span class="text-xs flex items-center gap-1">Languages: 
            <div class="flex flex-wrap gap-1">
              {#each worker.languages as language}
                <span class="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">{language}</span>
              {/each}
            </div>
          </span>
        </div>
      {/if}

      {#if worker.verifications && worker.verifications.length > 0}
        <div class="flex items-center">
          <BadgeCheck class="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
          <span class="text-xs">Verifications: <span class="font-medium text-gray-700">{worker.verifications.join(', ')}</span></span>
        </div>
      {/if}
      

        <div class="flex items-center">
          <Briefcase class="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
          <span class="text-xs">Total Work Experience: 
            {#if worker.totalWorkExperience}
            <span class="font-medium text-gray-700">{worker.totalWorkExperience} yrs</span>
            {:else}
              <span class="font-medium text-gray-700">Not specified</span>
            {/if}
          </span>
        </div>

      
      {#if worker.preferredSpeciality && worker.preferredSpeciality.length > 0}
        <div class="flex items-start">
          <Briefcase class="w-4 h-4 mr-2 text-gray-400 flex-shrink-0 mt-0.5" />
          <span class="text-xs">Preferred Speciality: <span class="font-medium text-gray-700">{worker.preferredSpeciality.join(', ')}</span></span>
        </div>
      {/if}
      
      {#if worker.preferredLocations && worker.preferredLocations.length > 0}
        <div class="flex items-center">
          <MapPin class="w-4 h-4 mr-2 text-gray-400 flex-shrink-0 mt-0.5" />
          <span class="text-xs">Preferred Locations: <span class="font-medium text-gray-700">{worker.preferredLocations.join(', ')}</span></span>
        </div>
      {/if}
      
      {#if worker.countriesLookingForJob && worker.countriesLookingForJob.length > 0}
        <div class="flex items-start">
          <Globe class="w-4 h-4 mr-2 text-gray-400 flex-shrink-0 mt-0.5" />
          <span class="text-xs">Looking For Work In: <span class="font-medium text-gray-700">{worker.countriesLookingForJob.join(', ')}</span></span>
        </div>
      {/if}
      
      {#if worker.interestedOffers && worker.interestedOffers.length > 0}
        <div class="flex items-start">
          <Calendar1 class="w-4 h-4 mr-2 text-gray-400 flex-shrink-0 mt-0.5" />
          <span class="text-xs">Availability: <span class="font-medium text-gray-700">{worker.interestedOffers.join(', ')}</span></span>
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
      
      <div class="flex  gap-2  w-full items-center flex-wrap">
        {#if worker.verified}
          <div class="flex items-center text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
            <BadgeCheck class="w-3 h-3 mr-1" />
            <span>Verified</span>
          </div>
        {/if}
        {#if worker.recentlyActive}
          <div class="flex items-center text-xs bg-blue-50 text-blue-800 px-2 py-1 rounded-full">
            <Clock class="w-3 h-3 mr-1" />
            <span>Recently Active</span>
          </div>
        {/if}
        {#if status}
        <div class="flex items-center text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
          <Check class="w-3 h-3 mr-1" />
          <span>{status}</span>
        </div>
      {/if}
      </div>
     

    </Card.Footer>
  </Card.Root>