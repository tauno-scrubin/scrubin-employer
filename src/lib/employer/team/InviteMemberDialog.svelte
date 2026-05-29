<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { t } from '$lib/i18n';
	import { toast } from 'svelte-sonner';
	import type { CompanyUserRole } from '$lib/scrubinClient';
	import { teamState } from './team-state.svelte';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let email = $state('');
	let role = $state<CompanyUserRole>('manager');
	let submitting = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!email.includes('@')) {
			toast.error('Enter a valid email');
			return;
		}
		submitting = true;
		try {
			await teamState.invite(email.trim().toLowerCase(), role);
			toast.success($t('team.invite.title'));
			email = '';
			role = 'manager';
			open = false;
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Failed to send invite');
		} finally {
			submitting = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{$t('team.invite.title')}</Dialog.Title>
		</Dialog.Header>
		<form onsubmit={submit} class="space-y-4">
			<div class="space-y-1">
				<Label for="invite-email">{$t('team.invite.emailLabel')}</Label>
				<Input id="invite-email" type="email" bind:value={email} required />
			</div>
			<div class="space-y-1">
				<Label>{$t('team.invite.roleLabel')}</Label>
				<div class="space-y-2">
					<label class="flex items-start gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
						<input type="radio" bind:group={role} value="manager" class="mt-1" />
						<div>
							<div class="text-sm font-medium">{$t('team.roles.manager')}</div>
							<div class="text-xs text-muted-foreground">{$t('team.invite.managerHint')}</div>
						</div>
					</label>
					<label class="flex items-start gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
						<input type="radio" bind:group={role} value="admin" class="mt-1" />
						<div>
							<div class="text-sm font-medium">{$t('team.roles.admin')}</div>
							<div class="text-xs text-muted-foreground">{$t('team.invite.adminHint')}</div>
						</div>
					</label>
				</div>
			</div>
			<Dialog.Footer>
				<Button type="button" variant="ghost" onclick={() => (open = false)}>{$t('buttons.cancel')}</Button>
				<Button type="submit" disabled={submitting}>
					{submitting ? '…' : $t('team.invite.submit')}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
