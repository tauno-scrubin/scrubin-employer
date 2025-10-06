<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { Loader2, Send, Sparkle, Check } from 'lucide-svelte';
	import { onMount, tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { slide } from 'svelte/transition';
	import type {
		ChatSessionResponse,
		JobRequirementDto,
		CompanyPlanSummary,
		PlanType
	} from '@/scrubinClient';
	import { scrubinClient } from '@/scrubinClient/client';
	import { t } from '$lib/i18n';

	let {
		chatSessionId = $bindable<string | undefined>(undefined),
		requirementId = $bindable<number | undefined>(undefined),
		jobRequirements = $bindable<JobRequirementDto | null>(null),
		maxHeight = $bindable<string | undefined>(undefined) // optional: cap overall widget height (e.g., '70vh')
	} = $props();

	let messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }> = $state(
		[]
	);
	let currentMessage = $state('');
	let isSending = $state(false);
	let session: ChatSessionResponse | null = $state(null);
	let chatContainer: HTMLElement;
	let companyActivePlans = $state<CompanyPlanSummary[]>([]);
	let isComplete = $state(false);
	let showActivate = $state(false);
	let activationInProgress = $state(false);

	onMount(async () => {
		await Promise.allSettled([
			(async () => {
				try {
					companyActivePlans = await scrubinClient.company.getActivePlans();
				} catch (e) {
					console.error('Failed to load active plans', e);
				}
			})(),
			initializeSession()
		]);
		setTimeout(() => {
			scrollToBottom();
		}, 200);
	});

	async function initializeSession() {
		try {
			if (chatSessionId) {
				await loadSessionData(chatSessionId);
				return;
			}
			if (requirementId) {
				const s = await scrubinClient.hunt.getRequirementChatResult(requirementId);
				session = s;
				chatSessionId = s.sessionId;
				updateFromSession(s);
			}
		} catch (error) {
			console.error('Error initializing chat session:', error);
			toast.error($t('requirementsChat.errors.loadSession'));
		}
	}

	function updateFromSession(s: ChatSessionResponse) {
		jobRequirements = s.currentRequirements;
		isComplete = Boolean(s.isComplete);
		const chatMessages = s.chatMessages.items
			.map((m) => ({
				role: m.role as 'user' | 'assistant',
				content: m.message,
				timestamp: new Date(m.createdDateTime)
			}))
			.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
		messages = chatMessages;
	}

	async function loadSessionData(id: string) {
		const s = await scrubinClient.hunt.getChatSession(id);
		session = s;
		updateFromSession(s);
		await scrollToBottom();
	}

	async function sendMessage(message: string) {
		if (!message.trim() || isSending || !chatSessionId) return;

		const userMessage = message.trim();
		currentMessage = '';
		isSending = true;

		messages = [...messages, { role: 'user', content: userMessage, timestamp: new Date() }];
		setTimeout(() => {
			scrollToBottom();
		}, 10);

		try {
			const s = await scrubinClient.hunt.requirementsChat({ message: userMessage, chatSessionId });
			session = s;
			updateFromSession(s);
			await scrollToBottom();
		} catch (error) {
			console.error('Error sending message:', error);
			toast.error($t('requirementsChat.errors.sendMessage'));
			messages = [
				...messages,
				{
					role: 'assistant',
					content: $t('requirementsChat.errorMessage'),
					timestamp: new Date()
				}
			];
		} finally {
			isSending = false;
		}
	}

	async function scrollToBottom() {
		await tick();
		if (!chatContainer) return;
		chatContainer.scrollTop = chatContainer.scrollHeight;
		requestAnimationFrame(() => {
			if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
		});
	}

	$effect(() => {
		if (messages.length > 0) setTimeout(() => scrollToBottom(), 50);
	});

	$effect(() => {
		if (isSending) setTimeout(() => scrollToBottom(), 100);
	});

	$effect(() => {
		if (currentMessage === '' && messages.length > 0) setTimeout(() => scrollToBottom(), 20);
	});

	$effect(() => {
		const hasActivePlan = companyActivePlans.some((p) => p.planActive);
		showActivate = hasActivePlan && isComplete;
	});

	async function activateRequirements() {
		if (!jobRequirements?.id) return;
		if (activationInProgress) return;
		try {
			activationInProgress = true;
			const activePlan = companyActivePlans?.find((p) => p.planActive);
			if (!activePlan) {
				toast.error($t('requirementsDetails.planRequired.description'));
				return;
			}
			const result = await scrubinClient.hunt.createHuntAndActivateFromRequirements(
				jobRequirements.id,
				activePlan.planType as PlanType
			);
			window.location.href = `/dashboard/hunts/${result.huntId}`;
		} catch (error) {
			console.error('Error activating requirements:', error);
			toast.error($t('common.error'));
		} finally {
			activationInProgress = false;
		}
	}
</script>

<div
	class="flex h-full min-h-[300px] flex-col"
	style={maxHeight ? `max-height:${maxHeight}` : undefined}
>
	<div class="flex flex-1 flex-col overflow-hidden rounded-lg border bg-white shadow-sm">
		<div class="flex items-center justify-between p-4 shadow-sm">
			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
					<Sparkle class="h-5 w-5 text-blue-600" />
				</div>
				<div>
					<h2 class="text-lg font-semibold text-gray-900">{$t('requirementsChat.title')}</h2>
					<p class="text-sm text-gray-500">{$t('requirementsChat.subtitle')}</p>
				</div>
			</div>
			{#if showActivate}
				<Button
					onclick={activateRequirements}
					variant="default"
					size="sm"
					class="gap-2 rounded-md shadow-sm"
					disabled={activationInProgress}
				>
					<Check class="h-4 w-4" />
					<span>{$t('requirementsDetails.readyToActivate.button')}</span>
				</Button>
			{/if}
		</div>

		<Separator />

		<div bind:this={chatContainer} class="flex-1 overflow-y-auto p-4">
			<div class="flex min-h-full flex-col justify-end gap-4">
				{#if messages.length === 0}
					<div class="flex items-center justify-center py-16">
						<div class="text-center">
							<Sparkle class="mx-auto h-12 w-12 text-gray-300" />
						</div>
					</div>
				{:else}
					{#each messages as message}
						<div
							class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}"
							transition:slide={{ delay: 100, duration: 200 }}
						>
							<div
								class="max-w-[85%] rounded-lg px-3 py-2 {message.role === 'user'
									? 'bg-blue-600 text-white'
									: 'bg-gray-100 text-gray-900'}"
							>
								<p class="text-sm">{message.content}</p>
							</div>
						</div>
					{/each}
				{/if}

				{#if isSending}
					<div class="flex justify-start" transition:slide={{ delay: 100, duration: 200 }}>
						<div class="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2">
							<Loader2 class="h-4 w-4 animate-spin text-gray-500" />
							<span class="text-sm text-gray-500">{$t('requirementsChat.thinking')}</span>
						</div>
					</div>
				{/if}
			</div>
		</div>
		<Separator />

		<div class="border-t p-4">
			<form
				onsubmit={(e) => {
					e.preventDefault();
					sendMessage(currentMessage);
				}}
				class="flex gap-3"
			>
				<Textarea
					bind:value={currentMessage}
					placeholder={$t('requirementsChat.placeholder')}
					class="max-h-32 min-h-[44px] w-full resize-none overflow-y-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
					rows={3}
					onkeydown={(e) => {
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault();
							if (currentMessage.trim() && !isSending) {
								sendMessage(currentMessage);
								setTimeout(() => {
									scrollToBottom();
								}, 10);
							}
						}
					}}
				/>
				<Button
					type="submit"
					disabled={!currentMessage.trim() || isSending}
					variant="default"
					size="sm"
					class="h-10 w-10 rounded-full p-0"
					onclick={() => setTimeout(() => scrollToBottom(), 10)}
				>
					{#if isSending}
						<Loader2 class="h-4 w-4 animate-spin" />
					{:else}
						<Send class="h-4 w-4" />
					{/if}
				</Button>
			</form>
		</div>
	</div>
</div>
