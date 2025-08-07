<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { visible } from '@/components/dashboard/overlay';
	import { scrubinClient } from '@/scrubinClient/client';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	// Chat state
	let currentMessage = $state('');
	let isSending = $state(false);

	async function startChatSession(message: string) {
		if (!message.trim() || isSending) return;

		const userMessage = message.trim();
		currentMessage = '';
		isSending = true;

		visible.set(true);

		try {
			// Initial POST to requirements/chat without chatSessionId
			const sessionResponse = await scrubinClient.hunt.requirementsChat({
				message: userMessage
			});

			// Redirect to session page
			goto(`/dashboard/requirements/session/${sessionResponse.sessionId}`);
		} catch (error) {
			console.error('Error starting chat session:', error);
			toast.error('Failed to start chat session. Please try again.');
			goto(`/dashboard`);
		} finally {
			isSending = false;
			visible.set(false);
		}
	}

	onMount(() => {
		const searchQuery = page.url.searchParams.get('search');
		if (searchQuery) {
			startChatSession(searchQuery);
		}
	});
</script>

<div class="flex min-h-screen items-center justify-center">
</div>
