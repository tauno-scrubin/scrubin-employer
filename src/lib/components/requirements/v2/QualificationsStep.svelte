<script lang="ts">
	import type { JobRequirementDto } from '@/scrubinClient';
	import { t } from '$lib/i18n';
	import { Info } from 'lucide-svelte';
	import RequiredQualificationsEditor from './RequiredQualificationsEditor.svelte';

	let {
		requirement = $bindable<JobRequirementDto>(),
		requirementId
	}: {
		requirement: JobRequirementDto;
		requirementId: number;
	} = $props();
</script>

<div class="w-full space-y-4">
	<div class="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 p-2.5">
		<Info class="h-4 w-4 flex-shrink-0 text-blue-600" />
		<p class="text-xs text-blue-800">
			{$t('requirementsV2.steps.qualifications.tip')}
		</p>
	</div>

	<div class="space-y-0.5">
		<h2 class="text-xl font-semibold">{$t('requirementsV2.steps.qualifications.heading')}</h2>
		<p class="text-xs text-muted-foreground">
			{$t('requirementsV2.steps.qualifications.subheading')}
		</p>
	</div>

	<RequiredQualificationsEditor bind:requirement {requirementId} />
</div>
