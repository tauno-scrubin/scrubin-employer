<script lang="ts">
	import { ComboboxMulti } from '$lib/components/ui/combobox-multi';
	import { Label } from '$lib/components/ui/label';
	import { locale, t } from '$lib/i18n';
	import type { JobRequirementDto } from '@/scrubinClient';
	import { scrubinClient, currentUserCompany } from '@/scrubinClient/client';
	import type { CodeNamePair } from '@/scrubinClient/models';
	import { Info } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { get } from 'svelte/store';

	let {
		requirement = $bindable<JobRequirementDto>(),
		requirementId
	}: {
		requirement: JobRequirementDto;
		requirementId: number;
	} = $props();

	let availableCountries = $state<CodeNamePair[]>([]);
	let isSaving = $state(false);

	// Local state for form fields
	let onlyCountries = $state<string[]>(
		requirement.countriesOnlyToSearch || requirement.huntInstructions?.onlyCountriesToSearch || []
	);
	let companyContext = $state(
		requirement.companyContext ||
		requirement.huntInstructions?.companyContext ||
		get(currentUserCompany)?.description ||
		''
	);
	let hiringContext = $state(
		requirement.hiringContext || requirement.huntInstructions?.hiringContext || ''
	);

	onMount(async () => {
		const lang = get(locale);
		availableCountries = await scrubinClient.data.getCountries(lang);
	});

	async function saveField(field: string) {
		if (!requirementId) return;

		isSaving = true;
		try {
			const updateData: any = {};

			if (field === 'targetCountries') {
				updateData.countriesOnlyToSearch = onlyCountries;
			} else if (field === 'context') {
				updateData.companyContext = companyContext;
				updateData.hiringContext = hiringContext;
			}

			const updated = await scrubinClient.hunt.updateRequirementFields(requirementId, updateData);
			requirement = { ...requirement, ...updated } as JobRequirementDto;
			toast.success($t('requirementsV2.success.saved'));
		} catch (error) {
			console.error('Failed to save:', error);
			toast.error($t('requirementsV2.errors.failedToSave'));
		} finally {
			isSaving = false;
		}
	}

	function handleContextBlur() {
		saveField('context');
	}

	$effect(() => {
		if (
			JSON.stringify(onlyCountries) !==
			JSON.stringify(
				requirement.countriesOnlyToSearch ||
					requirement.huntInstructions?.onlyCountriesToSearch ||
					[]
			)
		) {
			saveField('targetCountries');
		}
	});
</script>

<div class="w-full space-y-4">
	<!-- Info box -->
	<div class="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 p-2.5">
		<Info class="h-4 w-4 flex-shrink-0 text-blue-600" />
		<p class="text-xs text-blue-800">
			{$t('requirementsV2.tips.targeting.description')}
		</p>
	</div>

	<div class="space-y-0.5">
		<h2 class="text-xl font-semibold">{$t('requirementsV2.steps.targeting.heading')}</h2>
		<p class="text-xs text-muted-foreground">
			{$t('requirementsV2.steps.targeting.subheading')}
		</p>
	</div>

	<!-- Target Countries Section -->
	<div class="w-full space-y-4">
		<h3 class="text-lg font-semibold">{$t('requirementsV2.sections.geographicTargeting')}</h3>

		<!-- Country Filter -->
		<div class="space-y-3">
			<div>
				<Label class="text-base font-medium">{$t('requirementsV2.fields.onlyCountries.label')}</Label>
				<p class="mt-1 text-sm text-muted-foreground">
					{$t('requirementsV2.fields.onlyCountries.description')}
				</p>
			</div>
			<ComboboxMulti
				items={availableCountries.map((c) => ({ value: c.code, label: c.name }))}
				values={onlyCountries}
				onValuesChange={(vals) => (onlyCountries = vals)}
				placeholder={$t('requirementsV2.fields.onlyCountries.placeholder')}
				searchPlaceholder={$t('requirementsV2.fields.onlyCountries.searchPlaceholder')}
				emptyText={$t('requirementsV2.fields.onlyCountries.emptyText')}
				class="w-full bg-white"
			/>
			<div class="flex gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
				<Info class="mt-0.5 h-4 w-4 flex-shrink-0" />
				<p>
					{$t('requirementsV2.fields.onlyCountries.info')}
				</p>
			</div>
		</div>
	</div>

	<!-- Context Section -->
	<div class="w-full space-y-4">
		<h3 class="text-lg font-semibold">{$t('requirementsV2.sections.additionalContext')}</h3>

		<!-- Company Context -->
		<div class="space-y-3">
			<div>
				<Label for="companyContext" class="text-base font-medium">{$t('requirementsV2.fields.companyContext.label')}</Label>
				<p class="mt-1 text-sm text-muted-foreground">
					{$t('requirementsV2.fields.companyContext.description')}
				</p>
			</div>
			<textarea
				id="companyContext"
				bind:value={companyContext}
				onblur={handleContextBlur}
				placeholder={$t('requirementsV2.fields.companyContext.placeholder')}
				class="min-h-[150px] w-full rounded-md border bg-white p-4 text-base focus:outline-none focus:ring-2 focus:ring-primary"
				rows="6"
			></textarea>
		</div>

		<!-- Hiring Context -->
		<div class="space-y-3">
			<div>
				<Label for="hiringContext" class="text-base font-medium">{$t('requirementsV2.fields.hiringContext.label')}</Label>
				<p class="mt-1 text-sm text-muted-foreground">
					{$t('requirementsV2.fields.hiringContext.description')}
				</p>
			</div>
			<textarea
				id="hiringContext"
				bind:value={hiringContext}
				onblur={handleContextBlur}
				placeholder={$t('requirementsV2.fields.hiringContext.placeholder')}
				class="min-h-[150px] w-full rounded-md border bg-white p-4 text-base focus:outline-none focus:ring-2 focus:ring-primary"
				rows="6"
			></textarea>
		</div>
	</div>
</div>
