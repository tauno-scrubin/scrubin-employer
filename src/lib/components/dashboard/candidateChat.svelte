<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import type { ChatMessage, CreateChatMessageRequest } from '$lib/scrubinClient';
	import { scrubinClient } from '@/scrubinClient/client';
  

  let {
    huntId = $bindable(0),
    candidateId = $bindable(0)
  }: {
    huntId: number;
    candidateId: number;
  } = $props();
  
  let messages: ChatMessage[] = $state([]);
  let newMessage = $state('');
  let isLoading = $state(false);
  let scrollContainer: HTMLDivElement;
  
  // Fetch messages on component mount
  onMount(async () => {
    await fetchMessages();
  });
  
  async function fetchMessages() {
    isLoading = true;
    try {
      // Replace with your actual API call
      // Example: messages = await api.getChatMessages(candidateId);
      
      // Placeholder data for demonstration

      const allMessages = await scrubinClient.hunt.getInterestedCandidateChat(huntId, candidateId);
      messages = allMessages;
      
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      isLoading = false;
      scrollToBottom();
    }
  }
  
  async function sendMessage() {
    if (!newMessage.trim()) return;
    

    await scrubinClient.hunt.createInterestedCandidateMessage(huntId, candidateId, newMessage.trim());
    
    try {
 
      messages = [
        ...messages,
        {
          id: Date.now(), // Temporary ID
          message: newMessage,
          date: new Date().toISOString(),
          sentByCandidate: false,
          dateRead: ''
        }
      ];
      
      newMessage = '';
      scrollToBottom();
      
      // Optionally refresh messages from server
      // await fetchMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }


  function formatMessageTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'just now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
      return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
    }

    const diffInYears = Math.floor(diffInMonths / 12);
    return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
  }
  
  function scrollToBottom() {
    setTimeout(() => {
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }, 0);
  }
  
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }
</script>

<div class="flex flex-col h-full border rounded-lg overflow-hidden bg-white">
  <div class="p-3 border-b bg-gray-50">
    <h2 class="text-lg font-medium text-gray-800">Candidate Conversation</h2>
  </div>
  
  <ScrollArea class="flex-1 p-4 max-h-[calc(100vh-25rem)] overflow-y-auto">
    {#if isLoading}
      <div class="flex justify-center items-center h-full">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    {:else if messages.length === 0}
      <div class="flex justify-center items-center h-full text-gray-500 py-16">
        No messages yet. Start the conversation!
      </div>
    {:else}
      <div class="space-y-4">
        {#each messages as message (message.id)}
          <div class={`flex ${message.sentByCandidate ? 'justify-start' : 'justify-end'}`}>
            <div 
              class={`max-w-[80%] rounded-lg p-3 ${
                message.sentByCandidate 
                  ? 'bg-gray-100 text-gray-900' 
                  : 'bg-primary text-primary-foreground'
              }`}
            >
              <p class="whitespace-pre-wrap break-words">{message.message}</p>
              <p class={`text-xs mt-1 ${message.sentByCandidate ? 'text-gray-500' : 'text-primary-foreground/80'}`}>
                {formatMessageTime(message.date)}
                {#if !message.sentByCandidate && message.dateRead}
                  · Read
                {/if}
              </p>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </ScrollArea>
  
  <div class="p-4 border-t">
    <form onsubmit={sendMessage} class="flex gap-2">
      <Input
        type="text"
        placeholder="Type your message..."
        bind:value={newMessage}
        onkeydown={handleKeyDown}
        class="flex-1"
      />
      <Button type="submit" disabled={!newMessage.trim()}>
        Send
      </Button>
    </form>
  </div>
</div>
