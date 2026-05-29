<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { t } from '$lib/i18n';
	import { toast } from 'svelte-sonner';
	import type { HuntAccessState } from './hunt-access-state.svelte';
	import type { HuntRole } from '$lib/scrubinClient';

	let { open = $bindable(false), accessState }: { open?: boolean; accessState: HuntAccessState } = $props();

	let userId = $state<number | null>(null);
	let huntRole = $state<HuntRole>('collaborator');
	let submitting = $state(false);

	$effect(() => {
		if (open) {
			userId = null;
			huntRole = 'collaborator';
		}
	});

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!userId) return;
		submitting = true;
		try {
			await accessState.grant(userId, huntRole);
			toast.success($t('huntAccess.grantButton'));
			open = false;
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Failed');
		} finally {
			submitting = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{$t('huntAccess.addTeammate')}</Dialog.Title>
		</Dialog.Header>
		<form onsubmit={submit} class="space-y-4">
			<div class="space-y-1">
				<Label for="teammate">{$t('huntAccess.chooseUser')}</Label>
				{#if accessState.availableTeammates().length === 0}
					<p class="text-sm text-muted-foreground">{$t('huntAccess.viewerNoUsers')}</p>
				{:else}
					<select
						id="teammate"
						class="w-full rounded-md border bg-background px-3 py-2 text-sm"
						bind:value={userId}
						required
					>
						<option value={null}>—</option>
						{#each accessState.availableTeammates() as m (m.userId)}
							<option value={m.userId}>{[m.firstName, m.lastName].filter(Boolean).join(' ') || m.email} · {m.email}</option>
						{/each}
					</select>
				{/if}
			</div>
			<div class="space-y-1">
				<Label>{$t('huntAccess.chooseRole')}</Label>
				<div class="space-y-2">
					<label class="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
						<input type="radio" bind:group={huntRole} value="collaborator" />
						<span class="text-sm">{$t('huntAccess.roleCollaborator')}</span>
					</label>
					<label class="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
						<input type="radio" bind:group={huntRole} value="viewer" />
						<span class="text-sm">{$t('huntAccess.roleViewer')}</span>
					</label>
				</div>
			</div>
			<Dialog.Footer>
				<Button type="button" variant="ghost" onclick={() => (open = false)}>{$t('buttons.cancel')}</Button>
				<Button type="submit" disabled={submitting || !userId}>{submitting ? '…' : $t('huntAccess.grantButton')}</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
