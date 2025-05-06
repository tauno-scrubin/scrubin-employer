<script lang="ts">
	import type { Requirements } from '@/scrubinClient';
	import { ChartArea, Clock } from 'lucide-svelte';
	import { t } from '$lib/i18n';

	let {
		hiringPlan
	}: {
		hiringPlan: Requirements['hiringPlan'];
	} = $props();

	function formatDemand(demand: number) {
		// Scale 1-10 (eg, low, medium, high, very high)
		if (demand < 3) return $t('dashboard.demand.low');
		if (demand < 6) return $t('dashboard.demand.medium');
		if (demand < 8) return $t('dashboard.demand.high');
		return $t('dashboard.demand.veryHigh');
	}
</script>

<div class="mb-4 flex flex-col gap-2">
	<!-- Demand -->
	<div
		class="flex flex-col gap-1 rounded-md border bg-gradient-to-b from-neutral-50/50 via-white to-neutral-50/50 p-4 shadow-inner shadow-white"
	>
		<ChartArea class="h-4 w-4 text-blue-500" />
		<p class="text-sm font-medium text-primary">{$t('dashboard.demand.overallHiringDemand')}</p>
		<p class="text-sm text-gray-500">{formatDemand(hiringPlan.hiringDemand)}</p>
	</div>

	<!-- Minimum period -->
	<div
		class="flex flex-col gap-1 rounded-md border bg-gradient-to-b from-neutral-50 via-white to-neutral-50 p-4 shadow-inner shadow-white"
	>
		<Clock class="h-4 w-4 text-blue-500" />
		<p class="text-sm font-medium text-primary">{$t('dashboard.demand.estimatedTimeToFill')}</p>
		<p class="text-sm text-gray-500">
			{hiringPlan.hiringMinimumPeriodInMonths}
			{$t('dashboard.demand.months')}
		</p>
	</div>
</div>
