<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { t, formatDate } from '$lib/i18n';
	import { canManageHuntAccess } from '$lib/permissions';
	import { currentUser } from '$lib/scrubinClient/client';
	import { Check, ChevronDown } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import AddTeammateDialog from './AddTeammateDialog.svelte';
	import ShareLinkDialog from './ShareLinkDialog.svelte';
	import { HuntAccessState } from './hunt-access-state.svelte';

	let {
		huntId,
		onCountChange
	}: { huntId: number; onCountChange?: (count: number) => void } = $props();

	const accessState = new HuntAccessState(huntId);
	let addOpen = $state(false);
	let shareLinkOpen = $state(false);

	$effect(() => {
		if (canManageHuntAccess($currentUser)) {
			accessState.refresh();
		}
	});

	// Surface the share count to the parent so it can render a tab badge.
	$effect(() => {
		onCountChange?.(accessState.grants.length);
	});

	async function onSelectRole(
		accessId: number,
		current: 'collaborator' | 'viewer',
		next: 'collaborator' | 'viewer'
	) {
		if (next === current) return;
		try {
			await accessState.changeRole(accessId, next);
			toast.success($t('huntAccess.chooseRole'));
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Failed');
		}
	}

	async function onRevoke(accessId: number) {
		try {
			await accessState.revoke(accessId);
			toast.success($t('huntAccess.revoke'));
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Failed');
		}
	}

	async function onRevokeLink(linkId: number) {
		try {
			await accessState.revokeShareLink(linkId);
			toast.success($t('huntAccess.revoke'));
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Failed');
		}
	}
</script>

{#if canManageHuntAccess($currentUser)}
	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between gap-2">
			<Card.Title>{$t('huntAccess.sharedWithHeading')}</Card.Title>
			<div class="flex gap-2">
				<Button variant="outline" size="sm" onclick={() => (shareLinkOpen = true)}>{$t('huntAccess.shareLink.button')}</Button>
				<Button size="sm" onclick={() => (addOpen = true)}>{$t('huntAccess.addTeammate')}</Button>
			</div>
		</Card.Header>
		<Card.Content class="space-y-4">
			{#if accessState.grants.length === 0}
				<p class="text-sm text-muted-foreground">{$t('huntAccess.emptyState')}</p>
			{:else}
				<ul class="divide-y">
					{#each accessState.grants as g (g.id)}
						<li class="flex items-center justify-between gap-2 py-2">
							<div>
								<div class="text-sm font-medium">
									{[g.firstName, g.lastName].filter(Boolean).join(' ') || g.email}
								</div>
								<div class="text-xs text-muted-foreground">{g.email}</div>
							</div>
							<div class="flex items-center gap-2">
								<DropdownMenu.Root>
									<DropdownMenu.Trigger aria-label={$t('huntAccess.changeRoleAria')}>
										<span
											class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors {g.huntRole ===
											'collaborator'
												? 'bg-gray-900 text-white hover:bg-gray-800'
												: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
										>
											{$t(g.huntRole === 'collaborator' ? 'huntAccess.roleCollaborator' : 'huntAccess.roleViewer')}
											<ChevronDown class="h-3 w-3 opacity-70" />
										</span>
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="end" class="w-64">
										<DropdownMenu.Item onclick={() => onSelectRole(g.id, g.huntRole, 'collaborator')}>
											<div class="flex w-full items-start gap-2">
												<Check class="mt-0.5 h-4 w-4 flex-shrink-0 {g.huntRole === 'collaborator' ? 'opacity-100' : 'opacity-0'}" />
												<div class="flex flex-col">
													<span class="text-sm font-medium">{$t('huntAccess.roleCollaborator')}</span>
													<span class="text-xs text-muted-foreground">{$t('huntAccess.roleCollaboratorHint')}</span>
												</div>
											</div>
										</DropdownMenu.Item>
										<DropdownMenu.Item onclick={() => onSelectRole(g.id, g.huntRole, 'viewer')}>
											<div class="flex w-full items-start gap-2">
												<Check class="mt-0.5 h-4 w-4 flex-shrink-0 {g.huntRole === 'viewer' ? 'opacity-100' : 'opacity-0'}" />
												<div class="flex flex-col">
													<span class="text-sm font-medium">{$t('huntAccess.roleViewer')}</span>
													<span class="text-xs text-muted-foreground">{$t('huntAccess.roleViewerHint')}</span>
												</div>
											</div>
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
								<Button variant="ghost" size="sm" onclick={() => onRevoke(g.id)}>{$t('huntAccess.revoke')}</Button>
							</div>
						</li>
					{/each}
				</ul>
			{/if}

			{#if accessState.shareLinks.length > 0}
				<div class="border-t pt-3">
					<div class="text-sm font-medium mb-2">{$t('huntAccess.shareLink.activeLinks')}</div>
					<ul class="divide-y">
						{#each accessState.shareLinks as l (l.id)}
							<li class="flex items-center justify-between gap-2 py-2 text-sm">
								<div>
									<div>
										{l.scope === 'candidate' ? $t('huntAccess.shareLink.scopeCandidate') : $t('huntAccess.shareLink.scopeHunt')}
										{#if l.recipientEmail}· {l.recipientEmail}{/if}
									</div>
									<div class="text-xs text-muted-foreground">
										{$formatDate(l.expiresAt)} · {l.openedCount} ↗
									</div>
								</div>
								<Button variant="ghost" size="sm" onclick={() => onRevokeLink(l.id)}>{$t('huntAccess.revoke')}</Button>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<AddTeammateDialog bind:open={addOpen} {accessState} />
	<ShareLinkDialog bind:open={shareLinkOpen} {accessState} defaultScope="hunt" />
{/if}
