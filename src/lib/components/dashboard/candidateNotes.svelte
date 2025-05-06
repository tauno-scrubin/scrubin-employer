<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { t } from '$lib/i18n';
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

<div
	class="flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md"
>
	<!-- Notepad header -->
	<div class="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-3">
		<div class="flex flex-col">
			<h2 class="text-lg font-medium text-gray-800">{$t('dashboard.candidateNotes.title')}</h2>
			<span class="text-xs text-gray-500"
				>{$t('dashboard.candidateNotes.lastSaved')}: {lastSaved.toLocaleString()}</span
			>
		</div>
		{#if hasChanges}
			<div class="flex items-center gap-2">
				<span class="text-sm text-primary/20">{$t('dashboard.candidateNotes.unsavedChanges')}</span>
				<Button
					size="sm"
					onclick={saveNotes}
					disabled={isSaving}
					variant={isSaving ? 'outline' : 'default'}
				>
					{isSaving ? $t('dashboard.candidateNotes.saving') : $t('dashboard.candidateNotes.save')}
				</Button>
			</div>
		{/if}
	</div>

	<!-- Notepad content area with subtle lined paper effect -->
	<div
		class="bg-size-100%_1.5rem flex-1 bg-[linear-gradient(transparent_calc(1.5rem_-_1px),_#f1f5f9_calc(1.5rem),_transparent_1.5rem)] p-2"
	>
		<Textarea
			bind:value={notes}
			oninput={handleInput}
			placeholder={$t('dashboard.candidateNotes.placeholder')}
			class="h-full min-h-[200px] w-full resize-none border-none bg-transparent leading-6 text-gray-800 outline-none placeholder:text-gray-400 focus-visible:ring-0"
		/>
	</div>

	<!-- Notepad footer -->
	<div class="flex items-center justify-between border-t border-gray-200 bg-gray-50 p-2">
		<div class="flex items-center gap-1">
			<div class="h-2 w-2 rounded-full bg-gray-300"></div>
			<div class="h-2 w-2 rounded-full bg-gray-300"></div>
			<div class="h-2 w-2 rounded-full bg-gray-300"></div>
		</div>
		<span class="text-xs text-gray-500">
			{notes?.length || 0}
			{$t('dashboard.candidateNotes.characters')}
		</span>
	</div>
</div>
