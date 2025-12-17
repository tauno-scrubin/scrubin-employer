<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { ComboboxMulti } from '$lib/components/ui/combobox-multi';
	import { Combobox } from '$lib/components/ui/combobox';
	import { scrubinClient } from '@/scrubinClient/client';
	import type { JobRequirementDto, CodeNamePair } from '@/scrubinClient';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Save, Info } from 'lucide-svelte';
	import { locale, t } from '$lib/i18n';
	import { get } from 'svelte/store';

	let {
		requirement = $bindable<JobRequirementDto>(),
		requirementId
	}: {
		requirement: JobRequirementDto;
		requirementId: number;
	} = $props();

	let availableProfessions = $state<CodeNamePair[]>([]);
	let availableSpecialties = $state<CodeNamePair[]>([]);
	let isSaving = $state(false);

	// Local state for form fields
	let jobTitle = $state(requirement.jobTitle || '');
	let selectedProfessions = $state<number[]>(requirement.professionsV2 || []);
	let selectedSpecialization = $state<number | null>(requirement.specializationV2 || null);
	let workExperience = $state(requirement.jobRequiredWorkExperience || 0);
	let selectedLanguages = $state<string[]>(requirement.jobRequiredLanguages || []);
	let availableLanguages = $state<CodeNamePair[]>([]);

	onMount(async () => {
		const lang = get(locale);
		const [professions, specialties, languages] = await Promise.all([
			scrubinClient.data.getProfessions(lang),
			scrubinClient.data.getSpecialties(lang),
			scrubinClient.data.getLanguages(lang)
		]);
		availableProfessions = professions;
		availableSpecialties = specialties;
		availableLanguages = languages;
	});

	async function saveField(field: string, value: any) {
		if (!requirementId) return;

		isSaving = true;
		try {
			const updateData: any = {};

			if (field === 'jobTitle') {
				updateData.jobTitle = value;
			} else if (field === 'professions') {
				updateData.professions = value;
			} else if (field === 'specialization') {
				updateData.specialization = value;
			} else if (field === 'workExperience') {
				updateData.jobRequiredWorkExperience = value;
			} else if (field === 'languages') {
				updateData.jobRequiredLanguages = value;
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

	// Auto-save on blur
	function handleJobTitleBlur() {
		if (jobTitle !== requirement.jobTitle) {
			saveField('jobTitle', jobTitle);
		}
	}

	function handleWorkExperienceBlur() {
		if (workExperience !== requirement.jobRequiredWorkExperience) {
			saveField('workExperience', workExperience);
		}
	}

	$effect(() => {
		if (JSON.stringify(selectedProfessions) !== JSON.stringify(requirement.professionsV2 || [])) {
			saveField('professions', selectedProfessions);
		}
	});

	$effect(() => {
		if (selectedSpecialization !== requirement.specializationV2) {
			saveField('specialization', selectedSpecialization);
		}
	});

	$effect(() => {
		if (
			JSON.stringify(selectedLanguages) !== JSON.stringify(requirement.jobRequiredLanguages || [])
		) {
			saveField('languages', selectedLanguages);
		}
	});
</script>

<div class="w-full space-y-4">
	<!-- Info box -->
	<div class="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 p-2.5">
		<Info class="h-4 w-4 flex-shrink-0 text-blue-600" />
		<p class="text-xs text-blue-800">
			{$t('requirementsV2.tips.beSpecific.description')}
		</p>
	</div>

	<div class="space-y-0.5">
		<h2 class="text-xl font-semibold">{$t('requirementsV2.steps.basic.heading')}</h2>
		<p class="text-xs text-muted-foreground">
			{$t('requirementsV2.steps.basic.subheading')}
		</p>
	</div>

	<!-- Job Title -->
	<div class="space-y-2">
		<Label for="jobTitle" class="text-base font-medium">
			{$t('requirementsV2.fields.jobTitle.label')} <span class="text-destructive">*</span>
		</Label>
		<p class="text-sm text-muted-foreground">
			{$t('requirementsV2.fields.jobTitle.description')}
		</p>
		<Input
			id="jobTitle"
			type="text"
			bind:value={jobTitle}
			onblur={handleJobTitleBlur}
			placeholder={$t('requirementsV2.fields.jobTitle.placeholder')}
			class="text-base"
		/>
	</div>

	<!-- Professions & Specialization -->
	<div class="space-y-2">
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<!-- Professions -->
			<div class="space-y-2">
				<Label class="text-base font-medium">
					{$t('requirementsV2.fields.professions.label')} <span class="text-destructive">*</span>
				</Label>
				<p class="text-sm text-muted-foreground">
					{$t('requirementsV2.fields.professions.description')}
				</p>
				<ComboboxMulti
					items={availableProfessions.map((p) => ({ value: p.code, label: p.name }))}
					values={selectedProfessions.map(String)}
					onValuesChange={(vals) => (selectedProfessions = vals.map((v) => Number(v)))}
					placeholder={$t('requirementsV2.fields.professions.placeholder')}
					searchPlaceholder={$t('requirementsV2.fields.professions.searchPlaceholder')}
					emptyText={$t('search.noResults')}
					class="w-full"
				/>
			</div>

			<!-- Specialization -->
			<div class="space-y-2">
				<Label class="text-base font-medium">
					{$t('requirementsV2.fields.specialization.label')}
				</Label>
				<p class="text-sm text-muted-foreground">
					{$t('requirementsV2.fields.specialization.description')}
				</p>
				<Combobox
					items={availableSpecialties.map((s) => ({ value: s.code, label: s.name }))}
					value={selectedSpecialization !== null ? String(selectedSpecialization) : undefined}
					onValueChange={(v) => (selectedSpecialization = v ? Number(v) : null)}
					placeholder={$t('requirementsV2.fields.specialization.placeholder')}
					searchPlaceholder={$t('requirementsV2.fields.specialization.searchPlaceholder')}
					emptyText={$t('requirementsV2.fields.specialization.emptyText')}
					class="w-full"
				/>
			</div>
		</div>
	</div>

	<!-- Work Experience -->
	<div class="space-y-2">
		<Label for="workExperience" class="text-base font-medium">
			{$t('requirementsV2.fields.workExperience.label')}
		</Label>
		<p class="text-sm text-muted-foreground">
			{$t('requirementsV2.fields.workExperience.description')}
		</p>
		<Input
			id="workExperience"
			type="number"
			bind:value={workExperience}
			onblur={handleWorkExperienceBlur}
			min="0"
			placeholder={$t('requirementsV2.fields.workExperience.placeholder')}
			class="text-base"
		/>
	</div>

	<!-- Languages -->
	<div class="space-y-2">
		<Label class="text-base font-medium">{$t('requirementsV2.fields.languages.label')}</Label>
		<p class="text-sm text-muted-foreground">
			{$t('requirementsV2.fields.languages.description')}
		</p>
		<ComboboxMulti
			items={availableLanguages.map((l) => ({ value: l.code, label: l.name }))}
			values={selectedLanguages}
			onValuesChange={(vals) => (selectedLanguages = vals)}
			placeholder={$t('requirementsV2.fields.languages.placeholder')}
			searchPlaceholder={$t('requirementsV2.fields.languages.searchPlaceholder')}
			emptyText={$t('requirementsV2.fields.languages.emptyText')}
			class="w-full"
		/>
	</div>
</div>
