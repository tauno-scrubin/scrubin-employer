<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { t } from '$lib/i18n';
	import { toast } from 'svelte-sonner';
	import type { HuntAccessState } from './hunt-access-state.svelte';
	import type { ShareLinkScope } from '$lib/scrubinClient';

	let {
		open = $bindable(false),
		accessState,
		defaultScope = 'hunt',
		defaultCandidateId = null
	}: {
		open?: boolean;
		accessState: HuntAccessState;
		defaultScope?: ShareLinkScope;
		defaultCandidateId?: number | null;
	} = $props();

	let scope = $state<ShareLinkScope>(defaultScope);
	let expiresInDays = $state(7);
	let recipientEmail = $state('');
	let submitting = $state(false);
	let createdUrl = $state<string | null>(null);
	let copied = $state(false);

	$effect(() => {
		if (open) {
			scope = defaultScope;
			expiresInDays = 7;
			recipientEmail = '';
			createdUrl = null;
			copied = false;
		}
	});

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		submitting = true;
		try {
			const result = await accessState.createShareLink({
				scope,
				candidateId: scope === 'candidate' && defaultCandidateId ? defaultCandidateId : undefined,
				expiresInDays,
				recipientEmail: recipientEmail.trim() || undefined
			});
			createdUrl = result.url;
			toast.success($t('huntAccess.shareLink.create'));
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Failed');
		} finally {
			submitting = false;
		}
	}

	async function copyLink() {
		if (!createdUrl) return;
		try {
			await navigator.clipboard.writeText(createdUrl);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			// ignore — user can select + copy manually
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{$t('huntAccess.shareLink.title')}</Dialog.Title>
		</Dialog.Header>

		{#if createdUrl}
			<div class="space-y-3">
				<p class="text-sm text-muted-foreground">{$t('huntAccess.shareLink.copyHint')}</p>
				<Input value={createdUrl} readonly onclick={(e) => (e.currentTarget as HTMLInputElement).select()} />
				<Button onclick={copyLink}>{copied ? $t('huntAccess.shareLink.copied') : $t('huntAccess.shareLink.copyButton')}</Button>
			</div>
			<Dialog.Footer>
				<Button variant="ghost" onclick={() => (open = false)}>{$t('buttons.cancel')}</Button>
			</Dialog.Footer>
		{:else}
			<form onsubmit={submit} class="space-y-4">
				{#if defaultCandidateId == null}
					<div class="space-y-1">
						<Label>{$t('huntAccess.shareLink.scope')}</Label>
						<div class="space-y-2">
							<label class="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
								<input type="radio" bind:group={scope} value="hunt" />
								<span class="text-sm">{$t('huntAccess.shareLink.scopeHunt')}</span>
							</label>
						</div>
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">{$t('huntAccess.shareLink.scopeCandidate')}</p>
				{/if}
				<div class="space-y-1">
					<Label for="expires">{$t('huntAccess.shareLink.expiresInDays')}</Label>
					<Input id="expires" type="number" min="1" max="30" bind:value={expiresInDays} required />
				</div>
				<div class="space-y-1">
					<Label for="recipient">{$t('huntAccess.shareLink.recipientEmail')}</Label>
					<Input id="recipient" type="email" placeholder={$t('huntAccess.shareLink.recipientPlaceholder')} bind:value={recipientEmail} />
				</div>
				<Dialog.Footer>
					<Button type="button" variant="ghost" onclick={() => (open = false)}>{$t('buttons.cancel')}</Button>
					<Button type="submit" disabled={submitting}>{submitting ? '…' : $t('huntAccess.shareLink.create')}</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>
