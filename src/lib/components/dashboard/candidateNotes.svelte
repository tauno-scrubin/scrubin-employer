<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Textarea } from '$lib/components/ui/textarea';
  import type { UpdateCandidateNotesRequest } from '$lib/scrubinClient';
	import { scrubinClient } from '@/scrubinClient/client';
  

  let {
    huntId = $bindable(0),
    candidateId = $bindable(0),
    notes = $bindable('')
  }: {
    huntId: number;
    candidateId: number;
    notes: string;
  } = $props();

  let originalNotes = $state('');
  let isSaving = $state(false);
  let hasChanges = $state(false);
  let lastSaved = $state(new Date());

  async function saveNotes() {
    if (notes === originalNotes) return;
    
    isSaving = true;

    try {
      await scrubinClient.hunt.updateInterestedCandidateNotes(huntId, candidateId, notes);
      
      // Update original notes after successful save
      originalNotes = notes;
      hasChanges = false;
      lastSaved = new Date();
    } catch (error) {
      console.error('Failed to save notes:', error);
    } finally {
      isSaving = false;
    }
  }
  
  function handleInput() {
    hasChanges = notes !== originalNotes;
  }
</script>

<div class="flex flex-col h-full overflow-hidden bg-white rounded-lg shadow-md border border-gray-200">
  <!-- Notepad header -->
  <div class="bg-gray-50 border-b border-gray-200 p-3 flex justify-between items-center">
    <div class="flex flex-col">
      <h2 class="text-lg font-medium text-gray-800">Candidate Notes</h2>
      <span class="text-xs text-gray-500">Last saved: {lastSaved.toLocaleString()}</span>
    </div>
    {#if hasChanges}
      <div class="flex items-center gap-2">
        <span class="text-sm text-primary/20">Unsaved changes</span>
        <Button 
          size="sm" 
          onclick={saveNotes} 
          disabled={isSaving}
          variant={isSaving ? "outline" : "default"}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    {/if}
  </div>
  
  <!-- Notepad content area with subtle lined paper effect -->
  <div class="flex-1 p-2 bg-[linear-gradient(transparent_calc(1.5rem_-_1px),_#f1f5f9_calc(1.5rem),_transparent_1.5rem)] bg-size-100%_1.5rem">
      <Textarea
        bind:value={notes}
        oninput={handleInput}
        placeholder="Add notes about this candidate..."
        class="w-full h-full focus-visible:ring-0 min-h-[200px] resize-none bg-transparent border-none outline-none text-gray-800 placeholder:text-gray-400 leading-6"
      />
  </div>

  <!-- Notepad footer -->
  <div class="p-2 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
    <div class="flex items-center gap-1">
      <div class="w-2 h-2 rounded-full bg-gray-300"></div>
      <div class="w-2 h-2 rounded-full bg-gray-300"></div>
      <div class="w-2 h-2 rounded-full bg-gray-300"></div>
    </div>
    <span class="text-xs text-gray-500">
      {notes.length} characters
    </span>
  </div>
</div>
