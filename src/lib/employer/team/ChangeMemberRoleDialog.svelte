<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { t } from '$lib/i18n';
	import { toast } from 'svelte-sonner';
	import type { TeamMember } from '$lib/scrubinClient';
	import {
		MEMBERSHIP_CHOICES,
		membershipFromChoice,
		membershipToChoice,
		type MembershipChoice
	} from './membership-choice';
	import { teamState } from './team-state.svelte';

	let {
		open = $bindable(false),
		member
	}: {
		open?: boolean;
		member: TeamMember | null;
	} = $props();

	let selected = $state<MembershipChoice>('manager-view');
	let submitting = $state(false);

	$effect(() => {
		if (open && member) {
			selected = membershipToChoice(member.role, member.permissionLevel);
		}
	});

	const displayName = $derived(
		member ? [member.firstName, member.lastName].filter(Boolean).join(' ') || member.email : ''
	);

	const unchanged = $derived(
		!!member && selected === membershipToChoice(member.role, member.permissionLevel)
	);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!member || unchanged) {
			open = false;
			return;
		}
		submitting = true;
		try {
			const { role, permissionLevel } = membershipFromChoice(selected);
			await teamState.changeRole(member.id, role, permissionLevel);
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
					{#each MEMBERSHIP_CHOICES as option (option.value)}
						<label
							class="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted/50"
						>
							<input type="radio" bind:group={selected} value={option.value} class="mt-1" />
							<div>
								<div class="text-sm font-medium">{$t(option.labelKey)}</div>
								<div class="text-xs text-muted-foreground">{$t(option.hintKey)}</div>
							</div>
						</label>
					{/each}
				</div>
				<Dialog.Footer>
					<Button type="button" variant="ghost" onclick={() => (open = false)}
						>{$t('buttons.cancel')}</Button
					>
					<Button type="submit" disabled={submitting || unchanged}>
						{submitting ? '…' : $t('team.changeRoleDialog.save')}
					</Button>
				</Dialog.Footer>
			</form>
			<Label class="sr-only" for="member-role-noop">{$t('team.columns.role')}</Label>
		{/if}
	</Dialog.Content>
</Dialog.Root>
