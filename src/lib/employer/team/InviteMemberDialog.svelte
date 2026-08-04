<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { t } from '$lib/i18n';
	import { toast } from 'svelte-sonner';
	import {
		MEMBERSHIP_CHOICES,
		membershipFromChoice,
		type MembershipChoice
	} from './membership-choice';
	import { teamState } from './team-state.svelte';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let email = $state('');
	let choice = $state<MembershipChoice>('manager-view');
	let submitting = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!email.includes('@')) {
			toast.error('Enter a valid email');
			return;
		}
		submitting = true;
		try {
			const { role, permissionLevel } = membershipFromChoice(choice);
			await teamState.invite(email.trim().toLowerCase(), role, permissionLevel);
			toast.success($t('team.invite.title'));
			email = '';
			choice = 'manager-view';
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
					{#each MEMBERSHIP_CHOICES as option (option.value)}
						<label
							class="flex cursor-pointer items-start gap-2 rounded-md border p-3 hover:bg-muted/50"
						>
							<input type="radio" bind:group={choice} value={option.value} class="mt-1" />
							<div>
								<div class="text-sm font-medium">{$t(option.labelKey)}</div>
								<div class="text-xs text-muted-foreground">{$t(option.hintKey)}</div>
							</div>
						</label>
					{/each}
				</div>
			</div>
			<Dialog.Footer>
				<Button type="button" variant="ghost" onclick={() => (open = false)}
					>{$t('buttons.cancel')}</Button
				>
				<Button type="submit" disabled={submitting}>
					{submitting ? '…' : $t('team.invite.submit')}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
