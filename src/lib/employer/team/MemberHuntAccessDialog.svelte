<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { t } from '$lib/i18n';
	import { toast } from 'svelte-sonner';
	import type { HuntRole, MemberHuntAccessRow, TeamMember } from '$lib/scrubinClient';
	import { scrubinClient } from '$lib/scrubinClient/client';

	let {
		open = $bindable(false),
		member
	}: {
		open?: boolean;
		member: TeamMember | null;
	} = $props();

	type Selection = 'none' | HuntRole;

	let rows = $state<MemberHuntAccessRow[]>([]);
	let loading = $state(false);
	let savingHuntId = $state<number | null>(null);

	const displayName = $derived(
		member ? [member.firstName, member.lastName].filter(Boolean).join(' ') || member.email : ''
	);

	$effect(() => {
		if (open && member) {
			void refresh(member.id);
		} else if (!open) {
			rows = [];
		}
	});

	async function refresh(memberId: number) {
		loading = true;
		try {
			rows = await scrubinClient.team.listMemberHuntAccess(memberId);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Failed');
		} finally {
			loading = false;
		}
	}

	function currentSelection(row: MemberHuntAccessRow): Selection {
		return row.huntRole ?? 'none';
	}

	async function onChange(row: MemberHuntAccessRow, next: Selection) {
		if (!member) return;
		const previous = currentSelection(row);
		if (previous === next) return;
		savingHuntId = row.huntId;
		try {
			if (next === 'none') {
				if (row.accessId == null) return; // nothing to revoke
				await scrubinClient.huntAccess.revoke(row.huntId, row.accessId);
				replaceRow(row.huntId, { ...row, huntRole: null, accessId: undefined });
			} else if (row.accessId == null) {
				const created = await scrubinClient.huntAccess.grant(row.huntId, member.userId, next);
				replaceRow(row.huntId, { ...row, huntRole: next, accessId: created.id });
			} else {
				await scrubinClient.huntAccess.changeRole(row.huntId, row.accessId, next);
				replaceRow(row.huntId, { ...row, huntRole: next });
			}
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Failed');
			// Force a refresh so the UI doesn't lie about state after a failed write.
			if (member) await refresh(member.id);
		} finally {
			savingHuntId = null;
		}
	}

	function replaceRow(huntId: number, next: MemberHuntAccessRow) {
		rows = rows.map((r) => (r.huntId === huntId ? next : r));
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-lg">
		{#if member}
			<Dialog.Header>
				<Dialog.Title>{$t('team.manageHuntsDialog.title', { name: displayName })}</Dialog.Title>
				<Dialog.Description>{$t('team.manageHuntsDialog.description')}</Dialog.Description>
			</Dialog.Header>

			<div class="max-h-[60vh] space-y-2 overflow-y-auto">
				{#if loading}
					<p class="text-sm text-muted-foreground">…</p>
				{:else if rows.length === 0}
					<p class="text-sm text-muted-foreground">{$t('team.manageHuntsDialog.noHunts')}</p>
				{:else}
					{#each rows as row (row.huntId)}
						<div class="flex items-center justify-between gap-3 rounded-md border p-3">
							<div class="min-w-0 flex-1 text-sm font-medium truncate">{row.jobTitle}</div>
							<select
								class="rounded-md border bg-background px-2 py-1 text-sm"
								disabled={savingHuntId === row.huntId}
								value={currentSelection(row)}
								onchange={(e) => onChange(row, (e.currentTarget as HTMLSelectElement).value as Selection)}
							>
								<option value="none">{$t('team.manageHuntsDialog.access.none')}</option>
								<option value="viewer">{$t('team.manageHuntsDialog.access.viewer')}</option>
								<option value="collaborator">{$t('team.manageHuntsDialog.access.collaborator')}</option>
							</select>
						</div>
					{/each}
				{/if}
			</div>

			<Dialog.Footer>
				<Button variant="ghost" onclick={() => (open = false)}>{$t('team.manageHuntsDialog.close')}</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
