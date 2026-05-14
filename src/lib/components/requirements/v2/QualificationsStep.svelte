<script lang="ts">
	import type { JobRequirementDto } from '@/scrubinClient';
	import { t } from '$lib/i18n';
	import RequiredQualificationsEditor from './RequiredQualificationsEditor.svelte';

	let {
		requirement = $bindable<JobRequirementDto>(),
		requirementId
	}: {
		requirement: JobRequirementDto;
		requirementId: number;
	} = $props();
</script>

<div class="space-y-6">
	<div class="space-y-0.5">
		<h2 class="text-xl font-semibold">{$t('requirementsV2.steps.qualifications.heading')}</h2>
		<p class="text-xs text-muted-foreground">
			{$t('requirementsV2.steps.qualifications.subheading')}
		</p>
	</div>

	<RequiredQualificationsEditor bind:requirement {requirementId} />
</div>
