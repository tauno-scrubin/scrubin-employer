<script lang="ts">
	import { t } from '$lib/i18n';
	import type { Requirements } from '@/scrubinClient';
	import { Bot, Clock, Globe, Users } from 'lucide-svelte';
	import { getCurrencySymbol } from '../payment/payments';

	let {
		hiringPlan
	}: {
		hiringPlan: Requirements['hiringPlan'];
	} = $props();

	const features = [
		{
			icon: Clock,
			title: $t('dashboard.chatWindowPricing.features.nonStop.title'),
			description: $t('dashboard.chatWindowPricing.features.nonStop.description')
		},
		{
			icon: Globe,
			title: $t('dashboard.chatWindowPricing.features.timezone.title'),
			description: $t('dashboard.chatWindowPricing.features.timezone.description')
		},
		{
			icon: Bot,
			title: $t('dashboard.chatWindowPricing.features.ai.title'),
			description: $t('dashboard.chatWindowPricing.features.ai.description')
		},
		{
			icon: Users,
			title: $t('dashboard.chatWindowPricing.features.engagement.title'),
			description: $t('dashboard.chatWindowPricing.features.engagement.description')
		}
	];
</script>

<div
	class="mb-4 flex flex-col gap-4 rounded-lg border from-neutral-50/50 via-white to-neutral-50/50 p-5 shadow-inner shadow-white"
>
	<div>
		<h2 class="text-lg font-medium text-primary">{$t('dashboard.chatWindowPricing.title')}</h2>
		<p class="text-sm text-muted-foreground">{$t('dashboard.chatWindowPricing.description')}</p>
	</div>

	<div class="mt-1 flex items-baseline gap-1">
		<span class="text-2xl font-semibold"
			>{hiringPlan?.hiringInitialPriceForOneCandidate?.amount}
			{getCurrencySymbol(hiringPlan?.hiringInitialPriceForOneCandidate?.currency || 'EUR')}</span
		>
		<span class="text-sm text-muted-foreground">{$t('dashboard.chatWindowPricing.perMonth')}</span>
	</div>

	<div class="mt-1 grid gap-3">
		{#each features as feature}
			<div class="flex items-start gap-2">
				<feature.icon class="mt-0.5 h-4  w-4 text-blue-500" />
				<div>
					<h3 class="text-sm font-medium">{feature.title}</h3>
					<p class="text-xs text-muted-foreground">{feature.description}</p>
				</div>
			</div>
		{/each}
	</div>

	<p class="mt-2 text-xs text-muted-foreground">
		{$t('dashboard.chatWindowPricing.activateMessage')}
	</p>
</div>
