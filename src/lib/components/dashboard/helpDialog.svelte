<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { t } from '$lib/i18n';
	import { scrubinClient } from '@/scrubinClient/client';
	import { Calendar, Mail, MessageSquare, Phone, Send } from 'lucide-svelte';
	import Button from '../ui/button/button.svelte';

	let {
		open = $bindable()
	}: {
		open: boolean;
	} = $props();

	let accountManager = $state({
		name: 'Tarmo Korela',
		email: 'tarmo@scrubin.io',
		phone: '+372 5787 3185',
		avatar: '/avatar/tarmo.jpeg',
		calendar: 'https://calendar.app.google/VN4kA74b4Xjn6tHN7'
	});

	// Feedback state
	let feedbackContent = $state('');
	let isSending = $state(false);
	let sendSuccess = $state(false);
	let sendError = $state<string | null>(null);

	async function submitFeedback() {
		isSending = true;
		sendSuccess = false;
		sendError = null;
		try {
			await scrubinClient.portal.submitFeedback({ content: feedbackContent });
			sendSuccess = true;
			feedbackContent = '';
		} catch (e) {
			sendError = e instanceof Error ? e.message : 'Failed to send feedback';
		} finally {
			isSending = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="text-xl font-semibold">{$t('help.title')}</Dialog.Title>
			<Dialog.Description class="text-sm text-gray-500">
				{$t('help.description')}
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex flex-col gap-6 py-4">
			<div class="flex items-start gap-4">
				<Avatar.Root class="h-16 w-16">
					<Avatar.Image
						src={accountManager.avatar}
						alt={accountManager.name}
						class="h-full w-full object-cover"
					/>
					<Avatar.Fallback class="text-lg"
						>{accountManager.name
							.split(' ')
							.map((n) => n[0])
							.join('')}</Avatar.Fallback
					>
				</Avatar.Root>

				<div class="flex-1 space-y-4">
					<div>
						<h2 class="text-lg font-medium">{accountManager.name}</h2>
						<p class="text-sm text-gray-500">{$t('help.accountManager')}</p>
					</div>

					<div class="space-y-2">
						<a
							href={`mailto:${accountManager.email}`}
							class="group flex items-center gap-2 text-sm"
						>
							<Mail class="h-4 w-4 text-gray-500" />
							<span class="group-hover:text-blue-600 group-hover:underline"
								>{accountManager.email}</span
							>
						</a>

						<a href={`tel:${accountManager.phone}`} class="group flex items-center gap-2 text-sm">
							<Phone class="h-4 w-4 text-gray-500" />
							<span class="group-hover:text-blue-600 group-hover:underline"
								>{accountManager.phone}</span
							>
						</a>
					</div>
				</div>
			</div>

			<div class="mt-2 grid grid-cols-3 gap-2">
				<a
					href={`mailto:${accountManager.email}`}
					class="flex flex-col items-center justify-center rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100"
				>
					<Mail class="mb-1 h-5 w-5 text-blue-600" />
					<span class="text-xs">{$t('help.message')}</span>
				</a>
				<a
					href={`tel:${accountManager.phone}`}
					class="flex flex-col items-center justify-center rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100"
				>
					<Phone class="mb-1 h-5 w-5 text-blue-600" />
					<span class="text-xs">{$t('help.call')}</span>
				</a>
				<a
					href={accountManager.calendar}
					target="_blank"
					class="flex flex-col items-center justify-center rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100"
				>
					<Calendar class="mb-1 h-5 w-5 text-blue-600" />
					<span class="text-xs">{$t('help.schedule')}</span>
				</a>
			</div>
		</div>

		<!-- Feedback Section -->
		<div class="mt-4 border-t pt-4">
			<h3 class="mb-2 flex items-center gap-2 text-base font-medium">
				<MessageSquare class="h-4 w-4" />
				{$t('help.feedback')}
			</h3>
			<form on:submit|preventDefault={submitFeedback} class="flex flex-col gap-2">
				<textarea
					class="min-h-[60px] resize-none rounded-md border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					placeholder={$t('help.feedbackPlaceholder')}
					bind:value={feedbackContent}
					required
					rows={3}
					disabled={isSending}
				/>
				<div class="flex items-center gap-2">
					<Button type="submit" disabled={isSending || !feedbackContent.trim()}>
						<Send class="h-4 w-4" />
						{isSending ? $t('help.sending') : $t('help.send')}
					</Button>
					{#if sendSuccess}
						<span class="text-xs text-green-600">{$t('help.thankYou')}</span>
					{/if}
					{#if sendError}
						<span class="text-xs text-red-600">{sendError}</span>
					{/if}
				</div>
			</form>
		</div>
	</Dialog.Content>
</Dialog.Root>
