<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import {
		Tooltip,
		TooltipContent,
		TooltipProvider,
		TooltipTrigger
	} from '$lib/components/ui/tooltip';
	import { t } from '$lib/i18n';
	import type { ChatMessage } from '$lib/scrubinClient';
	import { scrubinClient } from '@/scrubinClient/client';
	import { Bell, Bot } from 'lucide-svelte';
	import { onMount } from 'svelte';

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
	let scrollContainer: HTMLElement | null = null;

	// Fetch messages on component mount
	onMount(async () => {
		await fetchMessages();
	});

	async function fetchMessages() {
		isLoading = true;
		try {
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
					dateRead: '',
					remindersCount: 0,
					createdByAssistant: false
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
			const container = scrollContainer;
			if (container) {
				container.scrollTop = container.scrollHeight;
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

	<TooltipProvider>
		<ScrollArea
			bind:ref={scrollContainer}
			class="max-h-[calc(100vh-25rem)] flex-1 overflow-y-auto p-4"
		>
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
										? 'border border-gray-200 bg-gray-100 text-gray-900'
										: 'border border-gray-200 bg-gray-50 text-gray-900'
								}`}
							>
								<div class="flex items-start gap-2">
									{#if !message.sentByCandidate && message.createdByAssistant}
										<Bot class="mt-0.5 h-4 w-4 text-gray-500" />
									{/if}
									<p class="flex-1 whitespace-pre-wrap break-words text-sm">{message.message}</p>
								</div>
								<p class={`mt-1 flex items-center gap-2 text-xs text-gray-600`}>
									{formatMessageTime(message.date)}
									{#if !message.sentByCandidate && message.dateRead}
										· {$t('dashboard.candidateChat.read')}
									{/if}
									{#if !message.sentByCandidate && message.remindersCount > 0}
										<Tooltip>
											<TooltipTrigger
												class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-gray-700"
											>
												<Bell class="h-3 w-3" />
												<span class="font-small">{message.remindersCount}</span>
											</TooltipTrigger>
											<TooltipContent>
												<span
													>{message.remindersCount}
													{$t('dashboard.candidateChat.remindersSent')}</span
												>
											</TooltipContent>
										</Tooltip>
									{/if}
								</p>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</ScrollArea>
	</TooltipProvider>

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
