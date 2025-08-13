<script lang="ts">
	import RequirementsChat from '$lib/components/requirements/RequirementsChat.svelte';
	import RequirementsDetails from '$lib/components/requirements/RequirementsDetails.svelte';
	import Button from '@/components/ui/button/button.svelte';
	import type { ChatSessionResponse } from '@/scrubinClient';
	import { ArrowLeft } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { scrubinClient } from '@/scrubinClient/client';
	import { page } from '$app/state';
	import { visible } from '@/components/dashboard/overlay';

	let session = $state<ChatSessionResponse | null>(null);
	let jobRequirements = $state<any>(null);
	let isComplete = $state(false);
	let potentialReach: number | null = $state(null);
	let completionPercentage = $state(0);
	let isLoading = $state(true);
	let errorMessage: string | null = $state(null);

	onMount(async () => {
		visible.set(true);
		try {
			if (!scrubinClient.authStore.isValid) {
				throw new Error('Unauthorized');
			}

			const requirementId = parseInt(page.params.id);
			const fetchedSession = await scrubinClient.hunt.getRequirementChatResult(requirementId);

			session = fetchedSession;
			jobRequirements = fetchedSession.currentRequirements;
			isComplete = fetchedSession.isComplete;
			potentialReach = fetchedSession.potentialTotalCandidateReach ?? null;
			completionPercentage = fetchedSession.completionPercentage;
		} catch (err) {
			console.error('Error loading requirement chat session:', err);
			errorMessage = 'Failed to load requirement chat session';
		} finally {
			isLoading = false;
			visible.set(false);
		}
	});

	function goToPrevPage() {
		window.history.back();
	}
</script>

<div class="flex items-center gap-4 px-6">
	<Button onclick={goToPrevPage} variant="outline" size="icon" class="h-9 w-9">
		<ArrowLeft class="h-4 w-4" />
	</Button>

	<div>
		{#if jobRequirements?.jobTitle}
			<h1 class="text-2xl font-bold tracking-tight">{jobRequirements.jobTitle}</h1>
		{:else}
			<h1 class="text-2xl font-bold tracking-tight">Requirements</h1>
		{/if}
	</div>
</div>

{#if errorMessage}
	<div class="flex h-screen items-center justify-center p-6">
		<div class="text-center">
			<h2 class="mb-2 text-xl font-semibold text-destructive">Error</h2>
			<p class="text-muted-foreground">{errorMessage}</p>
		</div>
	</div>
{:else if session}
	<div class="flex h-screen gap-6 p-6">
		<div class="flex w-2/5 flex-col">
			<RequirementsChat chatSessionId={session.sessionId} bind:jobRequirements />
		</div>
		<div class="flex w-3/5 flex-col">
			<RequirementsDetails
				requirements={jobRequirements}
				bind:isComplete
				bind:potentialReach
				bind:completionPercentage
			/>
		</div>
	</div>
{/if}
