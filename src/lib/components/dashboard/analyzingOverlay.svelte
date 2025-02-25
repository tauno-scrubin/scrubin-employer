<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Sparkles } from 'lucide-svelte';
  import { fade } from 'svelte/transition';
  import { visible, title } from './overlay';
	import ShinyText from '../shinyText.svelte';


  const messages = [
    "Analyzing your content...",
    "Processing your request...",
    "Generating insights...",
    "Thinking creatively...",
    "Exploring possibilities...",
    "Connecting the dots...",
    "Crafting a response...",
    "Considering context...",
    "Refining ideas...",
    "Almost there..."
  ];

  let currentMessageIndex = $state(0);
  let currentMessage = $state(messages[0]);
  let intervalId: ReturnType<typeof setInterval>;

  onMount(() => {
    startMessageRotation();
  });

  onDestroy(() => {
    clearInterval(intervalId);
  });

  function startMessageRotation() {
    intervalId = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * messages.length);
      currentMessageIndex = randomIndex;
      currentMessage = messages[randomIndex];
    }, 2000);
  }
</script>

{#if $visible}
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center"
    transition:fade={{ duration: 300 }}
  >
    <!-- Blurred background overlay -->
    <div class="absolute inset-0 bg-white/70 backdrop-blur-md"></div>
    
    <!-- Content container -->
    <div class="relative z-10 flex flex-col items-center justify-center space-y-6 text-center w-full">
      <!-- Sparkles icon with subtle animation -->
      <div class="animate-pulse">
        <Sparkles fill="currentColor" size={48} class="text-blue-500" strokeWidth={1.5} />
      </div>
      
      <!-- Rotating message with fade transition -->
      <div class="h-12 relative w-full">
        {#key currentMessage}
          <p 
            class="text-lg absolute top-0 w-full text-center font-normal text-gray-800"
            transition:fade={{ duration: 200 }}
          >
            <ShinyText>{currentMessage}</ShinyText>
          </p>
        {/key}
      </div>
    </div>
  </div>
{/if}
