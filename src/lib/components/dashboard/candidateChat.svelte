<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import type { ChatMessage, CreateChatMessageRequest } from '$lib/scrubinClient';
	import { scrubinClient } from '@/scrubinClient/client';
	import { t } from '$lib/i18n';

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

		await scrubinClient.hunt.createInterestedCandidateMessage(
			huntId,
			candidateId,
			newMessage.trim()
		);

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
			return $t('dashboard.candidateChat.justNow');
		}

		const diffInMinutes = Math.floor(diffInSeconds / 60);
		if (diffInMinutes < 60) {
			return `${diffInMinutes} ${diffInMinutes === 1 ? $t('dashboard.candidateChat.minuteAgo') : $t('dashboard.candidateChat.minutesAgo')}`;
		}

		const diffInHours = Math.floor(diffInMinutes / 60);
		if (diffInHours < 24) {
			return `${diffInHours} ${diffInHours === 1 ? $t('dashboard.candidateChat.hourAgo') : $t('dashboard.candidateChat.hoursAgo')}`;
		}

		const diffInDays = Math.floor(diffInHours / 24);
		if (diffInDays < 30) {
			return `${diffInDays} ${diffInDays === 1 ? $t('dashboard.candidateChat.dayAgo') : $t('dashboard.candidateChat.daysAgo')}`;
		}

		const diffInMonths = Math.floor(diffInDays / 30);
		if (diffInMonths < 12) {
			return `${diffInMonths} ${diffInMonths === 1 ? $t('dashboard.candidateChat.monthAgo') : $t('dashboard.candidateChat.monthsAgo')}`;
		}

		const diffInYears = Math.floor(diffInMonths / 12);
		return `${diffInYears} ${diffInYears === 1 ? $t('dashboard.candidateChat.yearAgo') : $t('dashboard.candidateChat.yearsAgo')}`;
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

<div class="flex h-full flex-col overflow-hidden rounded-lg border bg-white">
	<div class="border-b bg-gray-50 p-3">
		<h2 class="text-lg font-medium text-gray-800">{$t('dashboard.candidateChat.title')}</h2>
	</div>

	<ScrollArea class="max-h-[calc(100vh-25rem)] flex-1 overflow-y-auto p-4">
		{#if isLoading}
			<div class="flex h-full items-center justify-center">
				<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
			</div>
		{:else if messages.length === 0}
			<div class="flex h-full items-center justify-center py-16 text-gray-500">
				{$t('dashboard.candidateChat.noMessages')}
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
							<p
								class={`mt-1 text-xs ${message.sentByCandidate ? 'text-gray-500' : 'text-primary-foreground/80'}`}
							>
								{formatMessageTime(message.date)}
								{#if !message.sentByCandidate && message.dateRead}
									· {$t('dashboard.candidateChat.read')}
								{/if}
							</p>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</ScrollArea>

	<div class="border-t p-4">
		<form onsubmit={sendMessage} class="flex gap-2">
			<Input
				type="text"
				placeholder={$t('dashboard.candidateChat.messagePlaceholder')}
				bind:value={newMessage}
				onkeydown={handleKeyDown}
				class="flex-1"
			/>
			<Button type="submit" disabled={!newMessage.trim()}>
				{$t('dashboard.candidateChat.send')}
			</Button>
		</form>
	</div>
</div>
