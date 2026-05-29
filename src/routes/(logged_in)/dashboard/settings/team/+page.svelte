<script lang="ts">
	import SEO from '$lib/components/SEO.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { t, formatDateTime, formatDate } from '$lib/i18n';
	import { canManageTeam } from '$lib/permissions';
	import { currentUser } from '$lib/scrubinClient/client';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { teamState } from '$lib/employer/team/team-state.svelte';
	import InviteMemberDialog from '$lib/employer/team/InviteMemberDialog.svelte';
	import ChangeMemberRoleDialog from '$lib/employer/team/ChangeMemberRoleDialog.svelte';
	import MemberHuntAccessDialog from '$lib/employer/team/MemberHuntAccessDialog.svelte';
	import type { TeamMember } from '$lib/scrubinClient';
	import { goto } from '$app/navigation';

	let inviteOpen = $state(false);
	let changeRoleOpen = $state(false);
	let manageHuntsOpen = $state(false);
	let dialogMember = $state<TeamMember | null>(null);

	function openChangeRole(member: TeamMember) {
		dialogMember = member;
		changeRoleOpen = true;
	}

	function openManageHunts(member: TeamMember) {
		dialogMember = member;
		manageHuntsOpen = true;
	}

	onMount(async () => {
		if (!canManageTeam($currentUser)) {
			toast.error('You do not have access to team management');
			goto('/dashboard/settings');
			return;
		}
		await teamState.refresh();
	});

	function roleLabel(role: 'owner' | 'admin' | 'manager') {
		return $t(`team.roles.${role}`);
	}

	async function onRemove(memberId: number) {
		if (!confirm($t('team.confirmRemove'))) return;
		try {
			await teamState.remove(memberId);
			toast.success($t('team.actions.remove'));
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Failed');
		}
	}

	async function onResend(inviteId: number) {
		try {
			await teamState.resend(inviteId);
			toast.success($t('team.actions.resend'));
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Failed');
		}
	}

	async function onRevoke(inviteId: number) {
		if (!confirm($t('team.confirmRevoke'))) return;
		try {
			await teamState.revoke(inviteId);
			toast.success($t('team.actions.revoke'));
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Failed');
		}
	}
</script>

<SEO title="Team" description="Manage your Scrubin team" />

<div class="mx-auto w-full max-w-screen-xl space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-3xl font-bold tracking-tight">{$t('team.pageTitle')}</h2>
			<p class="text-sm text-muted-foreground">{$t('team.pageDescription')}</p>
		</div>
		<Button onclick={() => (inviteOpen = true)}>{$t('team.inviteButton')}</Button>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>{$t('team.membersHeading')}</Card.Title>
		</Card.Header>
		<Card.Content>
			{#if teamState.loading}
				<p class="text-sm text-muted-foreground">…</p>
			{:else if teamState.members.length === 0}
				<p class="text-sm text-muted-foreground">{$t('team.emptyMembers')}</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead class="text-left text-muted-foreground">
							<tr>
								<th class="py-2 pr-4">{$t('team.columns.name')}</th>
								<th class="py-2 pr-4">{$t('team.columns.email')}</th>
								<th class="py-2 pr-4">{$t('team.columns.role')}</th>
								<th class="py-2 pr-4">{$t('team.columns.lastLogin')}</th>
								<th class="py-2">{$t('team.columns.actions')}</th>
							</tr>
						</thead>
						<tbody>
							{#each teamState.members as m (m.id)}
								<tr class="border-t">
									<td class="py-2 pr-4">{[m.firstName, m.lastName].filter(Boolean).join(' ') || '—'}</td>
									<td class="py-2 pr-4">{m.email}</td>
									<td class="py-2 pr-4">
										<Badge variant={m.role === 'owner' ? 'default' : 'secondary'}>{roleLabel(m.role)}</Badge>
									</td>
									<td class="py-2 pr-4">{m.lastLogin ? $formatDateTime(m.lastLogin) : '—'}</td>
									<td class="py-2 space-x-2 whitespace-nowrap">
										{#if m.role !== 'owner'}
											<Button variant="ghost" size="sm" onclick={() => openManageHunts(m)}>{$t('team.actions.manageHunts')}</Button>
											<Button variant="ghost" size="sm" onclick={() => openChangeRole(m)}>{$t('team.actions.changeRole')}</Button>
											<Button variant="ghost" size="sm" onclick={() => onRemove(m.id)}>{$t('team.actions.remove')}</Button>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>{$t('team.invitesHeading')}</Card.Title>
		</Card.Header>
		<Card.Content>
			{#if teamState.invites.length === 0}
				<p class="text-sm text-muted-foreground">{$t('team.emptyInvites')}</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead class="text-left text-muted-foreground">
							<tr>
								<th class="py-2 pr-4">{$t('team.columns.email')}</th>
								<th class="py-2 pr-4">{$t('team.columns.role')}</th>
								<th class="py-2 pr-4">{$t('team.columns.expires')}</th>
								<th class="py-2">{$t('team.columns.actions')}</th>
							</tr>
						</thead>
						<tbody>
							{#each teamState.invites as i (i.id)}
								<tr class="border-t">
									<td class="py-2 pr-4">{i.email}</td>
									<td class="py-2 pr-4"><Badge variant="secondary">{roleLabel(i.role)}</Badge></td>
									<td class="py-2 pr-4">{$formatDate(i.expiresAt)}</td>
									<td class="py-2 space-x-2">
										<Button variant="ghost" size="sm" onclick={() => onResend(i.id)}>{$t('team.actions.resend')}</Button>
										<Button variant="ghost" size="sm" onclick={() => onRevoke(i.id)}>{$t('team.actions.revoke')}</Button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>

<InviteMemberDialog bind:open={inviteOpen} />
<ChangeMemberRoleDialog bind:open={changeRoleOpen} member={dialogMember} />
<MemberHuntAccessDialog bind:open={manageHuntsOpen} member={dialogMember} />
