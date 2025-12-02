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
			toast.success('Saved successfully');
		} catch (error) {
			console.error('Failed to save:', error);
			toast.error('Failed to save. Please try again.');
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
		if (
			JSON.stringify(selectedProfessions) !== JSON.stringify(requirement.professionsV2 || [])
		) {
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

<div class="space-y-8">
	<div>
		<h2 class="mb-2 text-2xl font-semibold">{$t('requirementsV2.steps.basic.heading')}</h2>
		<p class="text-sm text-muted-foreground">
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
		{#if selectedProfessions.length > 0}
			<div class="flex flex-wrap gap-2 pt-2">
				{#each selectedProfessions as profId}
					<span class="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
						{availableProfessions.find((p) => Number(p.code) === profId)?.name ?? profId}
					</span>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Specialization -->
	<div class="space-y-2">
		<Label class="text-base font-medium">Specialization</Label>
		<p class="text-sm text-muted-foreground">
			Optionally specify a specialization within the profession to narrow down the search.
		</p>
		<Combobox
			items={availableSpecialties.map((s) => ({ value: s.code, label: s.name }))}
			value={selectedSpecialization !== null ? String(selectedSpecialization) : undefined}
			onValueChange={(v) => (selectedSpecialization = v ? Number(v) : null)}
			placeholder="Select specialization (optional)..."
			searchPlaceholder="Search specializations..."
			emptyText="No specializations found"
			class="w-full"
		/>
		{#if selectedSpecialization}
			<div class="pt-2">
				<span class="rounded-full bg-purple-50 px-3 py-1 text-sm text-purple-700">
					{availableSpecialties.find((s) => Number(s.code) === selectedSpecialization)?.name ||
						selectedSpecialization}
				</span>
			</div>
		{/if}
	</div>

	<!-- Work Experience -->
	<div class="space-y-2">
		<Label for="workExperience" class="text-base font-medium">
			Required Work Experience (years)
		</Label>
		<p class="text-sm text-muted-foreground">
			Minimum years of relevant work experience required for this position.
		</p>
		<Input
			id="workExperience"
			type="number"
			bind:value={workExperience}
			onblur={handleWorkExperienceBlur}
			min="0"
			placeholder="0"
			class="text-base"
		/>
	</div>

	<!-- Languages -->
	<div class="space-y-2">
		<Label class="text-base font-medium">Required Languages</Label>
		<p class="text-sm text-muted-foreground">
			Select the languages candidates must be proficient in for this role.
		</p>
		<ComboboxMulti
			items={availableLanguages.map((l) => ({ value: l.code, label: l.name }))}
			values={selectedLanguages}
			onValuesChange={(vals) => (selectedLanguages = vals)}
			placeholder="Select languages..."
			searchPlaceholder="Search languages..."
			emptyText="No languages found"
			class="w-full"
		/>
		{#if selectedLanguages.length > 0}
			<div class="flex flex-wrap gap-2 pt-2">
				{#each selectedLanguages as langCode}
					<span class="rounded-full bg-green-50 px-3 py-1 text-sm text-green-700">
						{availableLanguages.find((l) => l.code === langCode)?.name || langCode}
					</span>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Info box -->
	<div class="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
		<Info class="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
		<div class="text-sm text-blue-900">
			<p class="font-medium">Tip: Be specific but not too restrictive</p>
			<p class="mt-1">
				Providing clear details helps us match you with the right candidates, but being too
				restrictive might limit your candidate pool.
			</p>
		</div>
	</div>
</div>
