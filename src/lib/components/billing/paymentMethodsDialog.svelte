<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { t } from '$lib/i18n';
	import CardManagement from './cardManagement.svelte';

	// Props
	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}

	let { open = $bindable(false), onOpenChange }: Props = $props();

	const handleOpenChange = (newOpen: boolean) => {
		open = newOpen;
		onOpenChange?.(newOpen);
	};
</script>

<Dialog.Root bind:open={open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>{$t('pricing.cardManagement.manageCards') || 'Manage Payment Methods'}</Dialog.Title>
			<Dialog.Description>
				{$t('pricing.cardManagement.manageCardsDescription') || 'Add, remove, or set your default payment method'}
			</Dialog.Description>
		</Dialog.Header>

		<div class="py-4">
			<CardManagement mode="full" />
		</div>
	</Dialog.Content>
</Dialog.Root>
