<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { t } from '$lib/i18n';
	import { toast } from 'svelte-sonner';
	import type { HuntAccessState } from './hunt-access-state.svelte';
	import type { HuntRole } from '$lib/scrubinClient';

	let { open = $bindable(false), accessState }: { open?: boolean; accessState: HuntAccessState } =
		$props();

	let userId = $state<number | null>(null);
	let huntRole = $state<HuntRole>('collaborator');
	let submitting = $state(false);

	$effect(() => {
		if (open) {
			userId = null;
			huntRole = 'collaborator';
		}
	});

	function memberLabel(m: { firstName?: string | null; lastName?: string | null; email: string }) {
		return [m.firstName, m.lastName].filter(Boolean).join(' ') || m.email;
	}

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
				{#if accessState.availableManagers().length === 0}
					<p class="text-sm text-muted-foreground">
						{accessState.hasNoTeammates()
							? $t('huntAccess.noTeammatesYet')
							: $t('huntAccess.viewerNoUsers')}
					</p>
				{:else}
					<select
						id="teammate"
						class="w-full rounded-md border bg-background px-3 py-2 text-sm"
						bind:value={userId}
						required
					>
						<option value={null}>—</option>
						{#each accessState.availableManagers() as m (m.userId)}
							<option value={m.userId}>{memberLabel(m)} · {m.email}</option>
						{/each}
					</select>
				{/if}
			</div>
			<div class="space-y-1">
				<Label>{$t('huntAccess.chooseRole')}</Label>
				<div class="space-y-2">
					<label
						class="flex cursor-pointer items-start gap-2 rounded-md border p-3 hover:bg-muted/50"
					>
						<input type="radio" bind:group={huntRole} value="collaborator" class="mt-1" />
						<div>
							<div class="text-sm font-medium">{$t('huntAccess.roleCollaborator')}</div>
							<div class="text-xs text-muted-foreground">
								{$t('huntAccess.roleCollaboratorHint')}
							</div>
						</div>
					</label>
					<label
						class="flex cursor-pointer items-start gap-2 rounded-md border p-3 hover:bg-muted/50"
					>
						<input type="radio" bind:group={huntRole} value="viewer" class="mt-1" />
						<div>
							<div class="text-sm font-medium">{$t('huntAccess.roleViewer')}</div>
							<div class="text-xs text-muted-foreground">{$t('huntAccess.roleViewerHint')}</div>
						</div>
					</label>
				</div>
			</div>

			{#if accessState.mainAccounts().length > 0}
				<div class="space-y-2 rounded-md border border-dashed p-3">
					<div class="text-sm font-medium">{$t('huntAccess.mainAccountsHeading')}</div>
					<p class="text-xs text-muted-foreground">{$t('huntAccess.mainAccountsNote')}</p>
					<ul class="space-y-1.5">
						{#each accessState.mainAccounts() as m (m.userId)}
							<li class="flex items-baseline justify-between gap-2 text-sm">
								<span class="truncate">{memberLabel(m)}</span>
								<span class="shrink-0 text-xs text-muted-foreground">
									{m.role === 'owner'
										? $t('huntAccess.roleOwnerLabel')
										: $t('huntAccess.roleAdminLabel')}
								</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<Dialog.Footer>
				<Button type="button" variant="ghost" onclick={() => (open = false)}
					>{$t('buttons.cancel')}</Button
				>
				<Button type="submit" disabled={submitting || !userId}
					>{submitting ? '…' : $t('huntAccess.grantButton')}</Button
				>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
