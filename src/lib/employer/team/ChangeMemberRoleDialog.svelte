<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { t } from '$lib/i18n';
	import { toast } from 'svelte-sonner';
	import type { CompanyUserRole, TeamMember } from '$lib/scrubinClient';
	import { teamState } from './team-state.svelte';

	let {
		open = $bindable(false),
		member
	}: {
		open?: boolean;
		member: TeamMember | null;
	} = $props();

	type ChangeableRole = Extract<CompanyUserRole, 'admin' | 'manager'>;

	let selected = $state<ChangeableRole>('manager');
	let submitting = $state(false);

	$effect(() => {
		if (open && member) {
			selected = (member.role === 'admin' ? 'admin' : 'manager') as ChangeableRole;
		}
	});

	const displayName = $derived(
		member ? [member.firstName, member.lastName].filter(Boolean).join(' ') || member.email : ''
	);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!member) return;
		if (selected === member.role) {
			open = false;
			return;
		}
		submitting = true;
		try {
			await teamState.changeRole(member.id, selected);
			toast.success($t('team.actions.changeRole'));
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
		{#if member}
			<Dialog.Header>
				<Dialog.Title>{$t('team.changeRoleDialog.title', { name: displayName })}</Dialog.Title>
				<Dialog.Description>{$t('team.changeRoleDialog.description')}</Dialog.Description>
			</Dialog.Header>
			<form onsubmit={submit} class="space-y-4">
				<div class="space-y-2">
					<label class="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
						<input type="radio" bind:group={selected} value="admin" class="mt-1" />
						<div>
							<div class="text-sm font-medium">{$t('team.changeRoleDialog.adminLabel')}</div>
							<div class="text-xs text-muted-foreground">{$t('team.changeRoleDialog.adminHint')}</div>
						</div>
					</label>
					<label class="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
						<input type="radio" bind:group={selected} value="manager" class="mt-1" />
						<div>
							<div class="text-sm font-medium">{$t('team.changeRoleDialog.managerLabel')}</div>
							<div class="text-xs text-muted-foreground">{$t('team.changeRoleDialog.managerHint')}</div>
						</div>
					</label>
				</div>
				<Dialog.Footer>
					<Button type="button" variant="ghost" onclick={() => (open = false)}>{$t('buttons.cancel')}</Button>
					<Button type="submit" disabled={submitting || selected === member.role}>
						{submitting ? '…' : $t('team.changeRoleDialog.save')}
					</Button>
				</Dialog.Footer>
			</form>
			<Label class="sr-only" for="member-role-noop">{$t('team.columns.role')}</Label>
		{/if}
	</Dialog.Content>
</Dialog.Root>
