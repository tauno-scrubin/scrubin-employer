<script lang="ts">
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Combobox } from '$lib/components/ui/combobox';
	import { ComboboxMulti } from '$lib/components/ui/combobox-multi';
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
	import DropdownComponent from '$lib/components/dropdownComponent.svelte';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import MarkdownToolbar from '$lib/components/ui/markdown-toolbar/MarkdownToolbar.svelte';
	import {
		markdownToHtml as mdToHtml,
		htmlToMarkdown,
		toggleBold,
		toggleItalic,
		toggleHeading,
		insertUnorderedList,
		insertOrderedList,
		insertLink,
		insertCode,
		setupKeyboardShortcuts
	} from '$lib/components/ui/markdown-toolbar/markdownEditor';
	import { locale, t } from '$lib/i18n';
	import type {
		CompanyPlanSummary,
		JobRequirementDto,
		PlanType,
		HuntDetail
	} from '@/scrubinClient';
	import { scrubinClient } from '@/scrubinClient/client';
	import type { CodeNamePair } from '@/scrubinClient/models';
	import { AlertCircle, Check, Info, Loader2, Pen, Users, X } from 'lucide-svelte';
	import { onMount, onDestroy } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { get } from 'svelte/store';

	let {
		requirements = $bindable<JobRequirementDto | null>(null),
		completionPercentage = $bindable(0),
		isComplete = $bindable(false),
		potentialReach = $bindable<number | null>(null),
		hunt = $bindable<HuntDetail | null>(null)
	} = $props();

	let companyActivePlans = $state<CompanyPlanSummary[]>([]);
	let availableCurrencies = $state<CodeNamePair[]>([]);
	let availableCountries = $state<CodeNamePair[]>([]);
	let availableProfessions = $state<CodeNamePair[]>([]);
	let availableSpecialties = $state<CodeNamePair[]>([]);
	let availableLanguages = $state<CodeNamePair[]>([]);
	let availableSalaryPeriods = $state<CodeNamePair[]>([]);
	let showActivate = $state(false);
	let activationInProgress = $state(false);

	let editableFields = $state({
		jobTitle: false,
		jobDescription: false,
		jobRequiredQualifications: false,
		jobRequiredWorkExperience: false,
		salaryStart: false,
		salaryEnd: false,
		salaryCurrency: false,
		salaryType: false,
		salaryExtra: false,
		country: false,
		city: false,
		address: false,
		stateProvinceRegion: false,
		professions: false,
		specialization: false,
		jobRequiredLanguages: false,
		targetPreferredCountries: false,
		targetOnlyCountries: false,
		companyContext: false,
		hiringContext: false
	});

	let editValues = $state({
		jobTitle: '',
		jobDescription: '',
		jobRequiredQualifications: '',
		jobRequiredWorkExperience: 0,
		salaryStart: 0,
		salaryEnd: 0,
		address: '',
		salaryCurrency: '',
		salaryType: '',
		salaryExtra: '',
		country: '',
		city: '',
		stateProvinceRegion: '' as string | string[],
		professionsV2: [] as number[],
		specializationV2: null as unknown as number | null,
		jobRequiredLanguages: [] as string[],
		huntPreferredCountries: [] as string[],
		huntOnlyCountries: [] as string[],
		companyContext: '',
		hiringContext: ''
	});

	let isSaving = $state(false);

	// Rich text editor refs
	let descriptionEditor: HTMLDivElement;
	let qualificationsEditor: HTMLDivElement;

	// Cleanup functions for keyboard shortcuts
	let cleanupDescriptionShortcuts: (() => void) | null = null;
	let cleanupQualificationsShortcuts: (() => void) | null = null;

	onMount(async () => {
		const lang = get(locale);
		const [countries, currencies, professions, specialties, languages, salaryPeriods, plans] =
			await Promise.all([
				scrubinClient.data.getCountries(lang),
				scrubinClient.data.getCurrencies(lang),
				scrubinClient.data.getProfessions(lang),
				scrubinClient.data.getSpecialties(lang),
				scrubinClient.data.getLanguages(lang),
				scrubinClient.data.getSalaryPeriods(lang),
				scrubinClient.company.getActivePlans()
			]);
		availableCountries = countries;
		availableCurrencies = currencies;
		availableProfessions = professions;
		availableSpecialties = specialties;
		availableLanguages = languages;
		availableSalaryPeriods = salaryPeriods;
		companyActivePlans = plans;
	});

	$effect(() => {
		const hasActivePlan = companyActivePlans.some((p) => p.planActive);
		const hasStatusToActivate = hunt && ['PENDING', 'PAUSED'].includes(hunt.status);
		showActivate = hasActivePlan && isComplete && (!hunt || hasStatusToActivate);
	});

	$effect(() => {
		if (requirements) {
			editValues = {
				jobTitle: requirements.jobTitle || '',
				jobDescription: requirements.jobDescription || '',
				jobRequiredQualifications: requirements.jobRequiredQualifications || '',
				jobRequiredWorkExperience: requirements.jobRequiredWorkExperience || 0,
				salaryStart: requirements.salary?.amountStart || 0,
				salaryEnd: requirements.salary?.amountEnd || 0,
				salaryCurrency: requirements.salary?.currency || '',
				salaryType: requirements.salary?.typeV2 || requirements.salary?.type || '',
				salaryExtra: requirements.salary?.salaryExtra || '',
				country: requirements.country || '',
				address: requirements.address?.address || '',
				city: requirements.address?.city || '',
				stateProvinceRegion: requirements.address?.stateProvinceRegion || [],
				professionsV2: requirements.professionsV2 || [],
				specializationV2: requirements.specializationV2 || undefined,
				jobRequiredLanguages: requirements.jobRequiredLanguages || [],
				huntPreferredCountries:
					requirements.countriesPreferredToSearch ||
					requirements.huntInstructions?.preferredCountriesToSearch ||
					[],
				huntOnlyCountries:
					requirements.countriesOnlyToSearch ||
					requirements.huntInstructions?.onlyCountriesToSearch ||
					[],
				companyContext:
					requirements.companyContext || requirements.huntInstructions?.companyContext || '',
				hiringContext:
					requirements.hiringContext || requirements.huntInstructions?.hiringContext || ''
			};
		}
	});

	async function saveField(field: keyof typeof editableFields) {
		if (!requirements?.id) return;
		isSaving = true;
		try {
			let updateData: any = {};
			if (
				field === 'salaryStart' ||
				field === 'salaryEnd' ||
				field === 'salaryCurrency' ||
				field === 'salaryType' ||
				field === 'salaryExtra'
			) {
				updateData = {
					salaryAmountStart: editValues.salaryStart || requirements.salary?.amountStart,
					salaryAmountEnd: editValues.salaryEnd || requirements.salary?.amountEnd,
					salaryCurrency: editValues.salaryCurrency || requirements.salary?.currency,
					salaryType:
						editValues.salaryType || requirements.salary?.typeV2 || requirements.salary?.type,
					salaryExtra: editValues.salaryExtra || requirements.salary?.salaryExtra
				};
			} else if (field === 'country' || field === 'city' || field === 'stateProvinceRegion') {
				updateData = {
					country: editValues.country,
					address: editValues.address,
					city: editValues.city,
					stateProvinceRegion: editValues.stateProvinceRegion
				};
			} else if (field === 'professions') {
				updateData = { professions: editValues.professionsV2 };
			} else if (field === 'specialization') {
				updateData = { specialization: editValues.specializationV2 };
			} else if (field === 'jobRequiredLanguages') {
				updateData = { jobRequiredLanguages: editValues.jobRequiredLanguages };
			} else if (field === 'targetPreferredCountries' || field === 'targetOnlyCountries') {
				updateData = {
					countriesPreferredToSearch: editValues.huntPreferredCountries,
					countriesOnlyToSearch: editValues.huntOnlyCountries
				};
			} else if (field === 'companyContext' || field === 'hiringContext') {
				updateData = {
					companyContext: editValues.companyContext,
					hiringContext: editValues.hiringContext
				};
			} else {
				updateData = { [field]: (editValues as any)[field] };
			}

			const updated = await scrubinClient.hunt.updateRequirementFields(requirements.id, updateData);
			// updated is Requirements['requirements']; adapt to JobRequirementDto shape we use in UI
			requirements = {
				...requirements,
				...updated
			} as unknown as JobRequirementDto;
			Object.keys(editableFields).forEach(
				(key) => (editableFields[key as keyof typeof editableFields] = false)
			);
			scrubinClient.hunt.getRequirementReach(requirements.id).then((reach) => {
				potentialReach = reach.potentialReach;
			});
			toast.success($t('common.success'));
		} catch (error) {
			console.error(`Failed to update ${field}:`, error);
			toast.error($t('common.error'));
		} finally {
			isSaving = false;
		}
	}

	function startEditing(field: keyof typeof editableFields) {
		Object.keys(editableFields).forEach(
			(key) => (editableFields[key as keyof typeof editableFields] = false)
		);
		editableFields[field] = true;

		// Initialize editor content after DOM updates
		setTimeout(() => {
			if (field === 'jobDescription' && descriptionEditor) {
				descriptionEditor.innerHTML = mdToHtml(editValues.jobDescription);
				// Setup keyboard shortcuts
				cleanupDescriptionShortcuts = setupKeyboardShortcuts(descriptionEditor, {
					onBold: descriptionBold,
					onItalic: descriptionItalic
				});
			} else if (field === 'jobRequiredQualifications' && qualificationsEditor) {
				qualificationsEditor.innerHTML = mdToHtml(editValues.jobRequiredQualifications);
				// Setup keyboard shortcuts
				cleanupQualificationsShortcuts = setupKeyboardShortcuts(qualificationsEditor, {
					onBold: qualificationsBold,
					onItalic: qualificationsItalic
				});
			}
		}, 0);
	}

	function cancelEditing(field: keyof typeof editableFields) {
		if (!requirements) return;
		// Reset snapshot for that field
		if (field === 'jobTitle') editValues.jobTitle = requirements.jobTitle || '';
		if (field === 'jobDescription') editValues.jobDescription = requirements.jobDescription || '';
		if (field === 'jobRequiredQualifications')
			editValues.jobRequiredQualifications = requirements.jobRequiredQualifications || '';
		if (field === 'jobRequiredWorkExperience')
			editValues.jobRequiredWorkExperience = requirements.jobRequiredWorkExperience || 0;
		if (field === 'salaryStart') editValues.salaryStart = requirements.salary?.amountStart || 0;
		if (field === 'salaryEnd') editValues.salaryEnd = requirements.salary?.amountEnd || 0;
		if (field === 'salaryCurrency') editValues.salaryCurrency = requirements.salary?.currency || '';
		if (field === 'salaryType')
			editValues.salaryType = requirements.salary?.typeV2 || requirements.salary?.type || '';
		if (field === 'salaryExtra') editValues.salaryExtra = requirements.salary?.salaryExtra || '';
		if (field === 'country') editValues.country = requirements.country || '';
		if (field === 'address') editValues.address = requirements.address?.address || '';
		if (field === 'city') editValues.city = requirements.address?.city || '';
		if (field === 'stateProvinceRegion')
			editValues.stateProvinceRegion = requirements.address?.stateProvinceRegion || [];
		if (field === 'professions') editValues.professionsV2 = requirements.professionsV2 || [];
		if (field === 'specialization')
			editValues.specializationV2 = requirements.specializationV2 || undefined;
		if (field === 'jobRequiredLanguages')
			editValues.jobRequiredLanguages = requirements.jobRequiredLanguages || [];
		if (field === 'targetPreferredCountries' || field === 'targetOnlyCountries') {
			editValues.huntPreferredCountries =
				requirements.huntInstructions?.preferredCountriesToSearch || [];
			editValues.huntOnlyCountries = requirements.huntInstructions?.onlyCountriesToSearch || [];
		}

		// Cleanup keyboard shortcuts for markdown editors
		if (field === 'jobDescription' && cleanupDescriptionShortcuts) {
			cleanupDescriptionShortcuts();
			cleanupDescriptionShortcuts = null;
		}
		if (field === 'jobRequiredQualifications' && cleanupQualificationsShortcuts) {
			cleanupQualificationsShortcuts();
			cleanupQualificationsShortcuts = null;
		}

		editableFields[field] = false;
	}

	// Toolbar handlers for description editor
	function descriptionBold() {
		toggleBold(descriptionEditor);
	}

	function descriptionItalic() {
		toggleItalic(descriptionEditor);
	}

	function descriptionHeading() {
		toggleHeading(descriptionEditor);
	}

	function descriptionUnorderedList() {
		insertUnorderedList(descriptionEditor);
	}

	function descriptionOrderedList() {
		insertOrderedList(descriptionEditor);
	}

	function descriptionLink() {
		insertLink(descriptionEditor);
	}

	function descriptionCode() {
		insertCode(descriptionEditor);
	}

	// Toolbar handlers for qualifications editor
	function qualificationsBold() {
		toggleBold(qualificationsEditor);
	}

	function qualificationsItalic() {
		toggleItalic(qualificationsEditor);
	}

	function qualificationsHeading() {
		toggleHeading(qualificationsEditor);
	}

	function qualificationsUnorderedList() {
		insertUnorderedList(qualificationsEditor);
	}

	function qualificationsOrderedList() {
		insertOrderedList(qualificationsEditor);
	}

	function qualificationsLink() {
		insertLink(qualificationsEditor);
	}

	function qualificationsCode() {
		insertCode(qualificationsEditor);
	}

	function handleDescriptionBlur() {
		if (!descriptionEditor) return;

		const markdown = htmlToMarkdown(descriptionEditor.innerHTML);
		editValues.jobDescription = markdown;
	}

	function handleQualificationsBlur() {
		if (!qualificationsEditor) return;

		const markdown = htmlToMarkdown(qualificationsEditor.innerHTML);
		editValues.jobRequiredQualifications = markdown;
	}

	onDestroy(() => {
		// Cleanup keyboard shortcuts
		if (cleanupDescriptionShortcuts) {
			cleanupDescriptionShortcuts();
		}
		if (cleanupQualificationsShortcuts) {
			cleanupQualificationsShortcuts();
		}
	});

	function formatNumber(num: number): string {
		if (num >= 1000) {
			return num.toLocaleString('en-US').replace(/,/g, ' ');
		}
		return num.toString();
	}

	async function activateRequirements() {
		if (!requirements?.id) return;
		if (activationInProgress) return;
		try {
			activationInProgress = true;
			const activePlan = companyActivePlans?.find((p) => p.planActive);
			if (!activePlan) {
				toast.error($t('requirementsDetails.planRequired.description'));
				return;
			}
			const result = await scrubinClient.hunt.createHuntAndActivateFromRequirements(
				requirements.id,
				activePlan.planType as PlanType
			);
			window.location.href = `/dashboard/hunts/${result.huntId}`;
		} catch (error) {
			console.error('Error activating requirements:', error);
			toast.error($t('common.error'));
		} finally {
			activationInProgress = false;
		}
	}
</script>

{#if requirements}
	<div
		class="flex h-full w-full max-w-full flex-col overflow-hidden rounded-lg border bg-white p-4 shadow-sm"
	>
		<div class="mb-4 flex items-center justify-between gap-3">
			<div class="flex items-center gap-3">
				<h3 class="text-xl font-medium">{$t('hunt.jobRequirements')}</h3>
				{#if potentialReach !== null && !(hunt && hunt.status === 'ACTIVE')}
					<Tooltip.Root>
						<Tooltip.Trigger>
							<span
								class="inline-flex cursor-default items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
							>
								<Users class="h-3 w-3" />
								{potentialReach?.toLocaleString?.() ?? potentialReach}
							</span>
						</Tooltip.Trigger>
						<Tooltip.Content side="top">{$t('requirementsDetails.potentialReach')}</Tooltip.Content>
					</Tooltip.Root>
				{/if}
			</div>
			<div class="flex items-center gap-2"></div>
		</div>

		{#if isComplete && !(hunt && ['ACTIVE', 'COMPLETED'].includes(hunt.status))}
			{#if companyActivePlans.some((p) => p.planActive)}
				<Alert
					variant="success"
					class="mb-3 flex items-center justify-between gap-3 rounded-md border-green-200 bg-green-50 px-3 py-2 text-green-700"
				>
					<div class="flex items-center gap-2">
						<Check class="h-4 w-4" />
						<div>
							<AlertTitle class="m-0 text-sm font-medium"
								>{$t('requirementsDetails.readyToActivate.title')}</AlertTitle
							>
							<AlertDescription class="m-0 text-xs"
								>{$t('requirementsDetails.readyToActivate.description')}</AlertDescription
							>
						</div>
					</div>
					{#if showActivate}
						<Button
							onclick={activateRequirements}
							variant="default"
							size="sm"
							class="gap-2 rounded-md shadow-sm"
							disabled={activationInProgress}
						>
							<Check class="h-4 w-4" />
							<span>{$t('requirementsDetails.readyToActivate.button')}</span>
						</Button>
					{/if}
				</Alert>
			{:else}
				<Alert
					variant="default"
					class="mb-3 flex items-center justify-between gap-3 rounded-md border-yellow-200 bg-yellow-50 px-3 py-2 text-yellow-700"
				>
					<div class="flex items-center gap-2">
						<AlertCircle class="h-4 w-4" />
						<div>
							<AlertTitle class="m-0 text-sm font-medium"
								>{$t('requirementsDetails.planRequired.title')}</AlertTitle
							>
							<AlertDescription class="m-0 text-xs"
								>{$t('requirementsDetails.planRequired.description')}</AlertDescription
							>
						</div>
					</div>
					<Button
						onclick={() => (window.location.href = '/dashboard/pricing')}
						variant="outline"
						size="sm"
						class="gap-2 rounded-md shadow-sm"
					>
						<span>{$t('requirementsDetails.planRequired.button')}</span>
					</Button>
				</Alert>
			{/if}
		{/if}

		<div class="flex-1 overflow-y-auto overflow-x-hidden">
			<div class="max-w-full space-y-3 text-sm">
				<!-- Title -->
				<div class="group rounded p-3 hover:bg-gray-50">
					{#if editableFields.jobTitle}
						<div class="flex w-full gap-2">
							<Input
								type="text"
								value={editValues.jobTitle}
								onchange={(e) => (editValues.jobTitle = e.currentTarget.value)}
								class="flex-1"
							/>
							<Button
								size="icon"
								variant="default"
								onclick={() => saveField('jobTitle')}
								disabled={isSaving}
								>{#if isSaving}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Check
										class="h-4 w-4"
									/>{/if}</Button
							>
							<Button size="icon" variant="outline" onclick={() => cancelEditing('jobTitle')}
								><X class="h-4 w-4" /></Button
							>
						</div>
					{:else}
						<div class="flex items-center gap-2">
							<p
								class={requirements.jobTitle
									? 'text-lg font-semibold text-gray-900'
									: 'text-lg text-gray-500'}
							>
								{requirements.jobTitle || $t('requirementsDetails.labels.untitledRole')}
							</p>
							<button
								class="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
								onclick={() => startEditing('jobTitle')}
								><Pen class="h-3.5 w-3.5 text-gray-600 hover:text-primary" /></button
							>
						</div>
					{/if}
				</div>

				<!-- Header meta grid (subset for reuse) -->
				<div class="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
					<!-- Professions -->
					<div class="group rounded p-3 hover:bg-gray-50">
						<div class="flex items-center gap-2">
							<p class="text-[11px] uppercase tracking-wide text-muted-foreground">
								{$t('hunt.professions')}
							</p>
							{#if !editableFields.professions}
								<button
									class="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
									onclick={() => startEditing('professions')}
									><Pen class="h-3.5 w-3.5 text-gray-600 hover:text-primary" /></button
								>
							{/if}
						</div>
						{#if editableFields.professions}
							<div class="mt-1 space-y-2">
								<ComboboxMulti
									items={availableProfessions.map((p) => ({ value: p.code, label: p.name }))}
									values={editValues.professionsV2.map(String)}
									onValuesChange={(vals) => (editValues.professionsV2 = vals.map((v) => Number(v)))}
									placeholder={$t('requirementsDetails.placeholders.selectProfessions')}
									searchPlaceholder={$t('requirementsDetails.placeholders.searchProfession')}
									emptyText={$t('requirementsDetails.labels.noResults')}
									class="w-full"
								/>
								<div class="flex justify-end gap-2">
									<Button
										size="icon"
										variant="default"
										onclick={() => saveField('professions')}
										disabled={isSaving}
										>{#if isSaving}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Check
												class="h-4 w-4"
											/>{/if}</Button
									>
									<Button size="icon" variant="outline" onclick={() => cancelEditing('professions')}
										><X class="h-4 w-4" /></Button
									>
								</div>
							</div>
						{:else}
							<div class="mt-1 flex flex-row flex-wrap items-center gap-2">
								{#if requirements.professionsV2 && requirements.professionsV2.length > 0}
									{#each requirements.professionsV2 as profId}
										<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
											{availableProfessions.find((p) => Number(p.code) === profId)?.name ?? profId}
										</span>
									{/each}
								{:else}
									<span class="text-gray-500">{$t('hunt.notSpecified')}</span>
								{/if}
							</div>
						{/if}
					</div>

					<!-- Specialization -->
					<div class="group rounded p-3 hover:bg-gray-50">
						<div class="flex items-center gap-2">
							<p class="text-[11px] uppercase tracking-wide text-muted-foreground">
								{$t('hunt.specialization')}
							</p>
							{#if !editableFields.specialization}
								<button
									class="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
									onclick={() => startEditing('specialization')}
									><Pen class="h-3.5 w-3.5 text-gray-600 hover:text-primary" /></button
								>
							{/if}
						</div>
						{#if editableFields.specialization}
							<div class="mt-1 space-y-2">
								<Combobox
									items={availableSpecialties.map((s) => ({ value: s.code, label: s.name }))}
									value={editValues.specializationV2 !== undefined
										? String(editValues.specializationV2)
										: undefined}
									onValueChange={(v) => (editValues.specializationV2 = v ? Number(v) : null)}
									placeholder={$t('requirementsDetails.placeholders.selectSpecialization')}
									searchPlaceholder={$t('requirementsDetails.placeholders.searchSpecialization')}
									emptyText={$t('requirementsDetails.labels.noResults')}
									class="w-full"
								/>
								<div class="flex justify-end gap-2">
									<Button
										size="icon"
										variant="default"
										onclick={() => saveField('specialization')}
										disabled={isSaving}
										>{#if isSaving}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Check
												class="h-4 w-4"
											/>{/if}</Button
									>
									<Button
										size="icon"
										variant="outline"
										onclick={() => cancelEditing('specialization')}><X class="h-4 w-4" /></Button
									>
								</div>
							</div>
						{:else}
							<div class="mt-1 flex items-center gap-2">
								<p class={requirements.specialization ? 'text-gray-900' : 'text-gray-500'}>
									{availableSpecialties.find(
										(s) => s.code === requirements?.specializationV2?.toString()
									)?.name || $t('hunt.notSpecified')}
								</p>
							</div>
						{/if}
					</div>

					<!-- Work experience -->
					<div class="group rounded p-3 hover:bg-gray-50">
						<div class="flex items-center gap-2">
							<p class="text-[11px] uppercase tracking-wide text-muted-foreground">
								{$t('hunt.workExperience')}
							</p>
							{#if !editableFields.jobRequiredWorkExperience}
								<button
									class="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
									onclick={() => startEditing('jobRequiredWorkExperience')}
									><Pen class="h-3.5 w-3.5 text-gray-600 hover:text-primary" /></button
								>
							{/if}
						</div>
						{#if editableFields.jobRequiredWorkExperience}
							<div class="mt-1 flex w-full gap-2">
								<Input
									type="number"
									value={editValues.jobRequiredWorkExperience}
									onchange={(e) =>
										(editValues.jobRequiredWorkExperience = parseInt(e.currentTarget.value) || 0)}
									class="flex-1"
									min="0"
								/>
								<Button
									size="icon"
									variant="default"
									onclick={() => saveField('jobRequiredWorkExperience')}
									disabled={isSaving}
									>{#if isSaving}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Check
											class="h-4 w-4"
										/>{/if}</Button
								>
								<Button
									size="icon"
									variant="outline"
									onclick={() => cancelEditing('jobRequiredWorkExperience')}
									><X class="h-4 w-4" /></Button
								>
							</div>
						{:else}
							<div class="mt-1 flex items-center gap-2">
								<p
									class={requirements.jobRequiredWorkExperience ? 'text-gray-900' : 'text-gray-500'}
								>
									{requirements.jobRequiredWorkExperience || 0}
									{$t('hunt.years')}
								</p>
							</div>
						{/if}
					</div>

					<!-- Location -->
					<div class="group rounded p-3 hover:bg-gray-50">
						<div class="flex items-center gap-2">
							<p class="text-[11px] uppercase tracking-wide text-muted-foreground">
								{$t('hunt.location')}
							</p>
							{#if !editableFields.country && !editableFields.city && !editableFields.stateProvinceRegion}
								<button
									class="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
									onclick={() => {
										startEditing('country');
										startEditing('city');
										startEditing('stateProvinceRegion');
									}}><Pen class="h-3.5 w-3.5 text-gray-600 hover:text-primary" /></button
								>
							{/if}
						</div>
						{#if editableFields.country || editableFields.city || editableFields.stateProvinceRegion}
							<div class="mt-1 flex w-full flex-col gap-3">
								<Combobox
									items={availableCountries.map((c) => ({ value: c.code, label: c.name }))}
									bind:value={editValues.country}
									placeholder={'Country'}
									searchPlaceholder={'Search country...'}
									emptyText={'No results'}
									class="w-full"
								/>
								<Input
									type="text"
									placeholder={$t('requirementsDetails.placeholders.city')}
									value={editValues.city}
									onchange={(e) => (editValues.city = e.currentTarget.value)}
									class="w-full"
								/>
								<Input
									type="text"
									placeholder={$t('requirementsDetails.placeholders.regionStateProvince')}
									value={editValues.stateProvinceRegion}
									onchange={(e) => (editValues.stateProvinceRegion = e.currentTarget.value)}
									class="w-full"
								/>
								<div class="flex justify-end gap-2">
									<Button
										size="icon"
										variant="default"
										onclick={() => saveField('country')}
										disabled={isSaving}
										>{#if isSaving}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Check
												class="h-4 w-4"
											/>{/if}</Button
									>
									<Button
										size="icon"
										variant="outline"
										onclick={() => {
											cancelEditing('country');
											cancelEditing('city');
											cancelEditing('stateProvinceRegion');
										}}><X class="h-4 w-4" /></Button
									>
								</div>
							</div>
						{:else}
							<div class="mt-1 flex items-center gap-2">
								<p
									class={requirements.address?.city || requirements.address?.stateProvinceRegion
										? 'text-gray-900'
										: 'text-gray-500'}
								>
									{availableCountries.find((c) => c.code === requirements?.countryIso)?.name ||
										requirements.country}, {requirements.address?.city || ''}
									{requirements.address?.stateProvinceRegion
										? Array.isArray(requirements.address.stateProvinceRegion)
											? requirements.address.stateProvinceRegion.join(', ')
											: requirements.address.stateProvinceRegion
										: ''}
								</p>
							</div>
						{/if}
					</div>

					<!-- Languages -->
					<div class="group rounded p-3 hover:bg-gray-50">
						<div class="flex items-center gap-2">
							<p class="text-[11px] uppercase tracking-wide text-muted-foreground">
								{$t('hunt.languages')}
							</p>
							{#if !editableFields.jobRequiredLanguages}
								<button
									class="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
									onclick={() => startEditing('jobRequiredLanguages')}
									><Pen class="h-3.5 w-3.5 text-gray-600 hover:text-primary" /></button
								>
							{/if}
						</div>
						{#if editableFields.jobRequiredLanguages}
							<div class="mt-1 space-y-2">
								<ComboboxMulti
									items={availableLanguages.map((l) => ({ value: l.code, label: l.name }))}
									values={editValues.jobRequiredLanguages as string[]}
									onValuesChange={(vals) => (editValues.jobRequiredLanguages = vals)}
									placeholder={$t('requirementsDetails.placeholders.selectLanguages')}
									searchPlaceholder={$t('requirementsDetails.placeholders.searchLanguage')}
									emptyText={$t('requirementsDetails.labels.noResults')}
									class="w-full"
								/>
								<div class="flex justify-end gap-2">
									<Button
										size="icon"
										variant="default"
										onclick={() => saveField('jobRequiredLanguages')}
										disabled={isSaving}
										>{#if isSaving}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Check
												class="h-4 w-4"
											/>{/if}</Button
									>
									<Button
										size="icon"
										variant="outline"
										onclick={() => cancelEditing('jobRequiredLanguages')}
										><X class="h-4 w-4" /></Button
									>
								</div>
							</div>
						{:else}
							<div class="mt-1 flex flex-wrap items-center gap-2">
								{#each requirements.jobRequiredLanguages || [] as language}
									<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
										>{availableLanguages.find((l) => l.code === language)?.name || language}</span
									>
								{/each}
								{#if !requirements.jobRequiredLanguages || requirements.jobRequiredLanguages.length === 0}
									<span class="text-gray-500">{$t('hunt.notSpecified')}</span>
								{/if}
							</div>
						{/if}
					</div>

					<!-- Salary -->
					<div class="group rounded p-3 hover:bg-gray-50">
						<div class="flex items-center gap-2">
							<p class="text-[11px] uppercase tracking-wide text-muted-foreground">
								{$t('hunt.salary')}
							</p>
							{#if !editableFields.salaryStart && !editableFields.salaryEnd && !editableFields.salaryCurrency && !editableFields.salaryType && !editableFields.salaryExtra}
								<button
									class="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
									onclick={() => {
										startEditing('salaryStart');
										startEditing('salaryEnd');
										startEditing('salaryCurrency');
										startEditing('salaryType');
										startEditing('salaryExtra');
									}}><Pen class="h-3.5 w-3.5 text-gray-600 hover:text-primary" /></button
								>
							{/if}
						</div>
						{#if editableFields.salaryStart || editableFields.salaryEnd || editableFields.salaryCurrency || editableFields.salaryType || editableFields.salaryExtra}
							<div class="mt-1 flex w-full flex-col gap-3">
								<div class="flex w-full items-center gap-2">
									<Input
										type="number"
										placeholder={$t('requirementsDetails.placeholders.from')}
										value={editValues.salaryStart}
										onchange={(e) =>
											(editValues.salaryStart = parseInt(e.currentTarget.value) || 0)}
										min="0"
										class="flex-1"
									/>
									<span class="text-gray-500">-</span>
									<Input
										type="number"
										placeholder={$t('requirementsDetails.placeholders.to')}
										value={editValues.salaryEnd}
										onchange={(e) => (editValues.salaryEnd = parseInt(e.currentTarget.value) || 0)}
										min="0"
										class="flex-1"
									/>
								</div>
								<DropdownComponent
									options={availableCurrencies}
									value={editValues.salaryCurrency}
									showLabelInBrackets={true}
									onValueChange={(value) => (editValues.salaryCurrency = value)}
									placeholder={$t('requirementsDetails.placeholders.currency')}
									optionKey="code"
									labelKey="name"
									class="w-full"
								/>
								<div>
									<DropdownComponent
										options={availableSalaryPeriods}
										value={editValues.salaryType}
										onValueChange={(value) => (editValues.salaryType = value)}
										placeholder={$t('requirementsDetails.placeholders.salaryPeriod')}
										optionKey="code"
										labelKey="name"
										class="w-full"
									/>
								</div>
								<textarea
									placeholder="Or enter custom salary description (e.g., '70% billing', 'Commission based', etc.)"
									value={editValues.salaryExtra}
									onchange={(e) => (editValues.salaryExtra = e.currentTarget.value)}
									class="min-h-[80px] w-full rounded-md border p-2 text-sm"
									rows="3"
								></textarea>
								<div class="flex justify-end gap-2">
									<Button
										size="icon"
										variant="default"
										onclick={() => saveField('salaryStart')}
										disabled={isSaving}
										>{#if isSaving}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Check
												class="h-4 w-4"
											/>{/if}</Button
									>
									<Button
										size="icon"
										variant="outline"
										onclick={() => {
											cancelEditing('salaryStart');
											cancelEditing('salaryEnd');
											cancelEditing('salaryCurrency');
											cancelEditing('salaryType');
											cancelEditing('salaryExtra');
										}}><X class="h-4 w-4" /></Button
									>
								</div>
							</div>
						{:else}
							<div class="mt-1 flex flex-col gap-1">
								{#if requirements.salary?.amountStart || requirements.salary?.amountEnd}
									<p class="text-gray-900">
										{#if requirements.salary?.amountStart && requirements.salary?.amountEnd}
											{formatNumber(requirements.salary.amountStart)} - {formatNumber(
												requirements.salary.amountEnd
											)}
										{:else if requirements.salary?.amountStart}
											{formatNumber(requirements.salary.amountStart)}+
										{:else if requirements.salary?.amountEnd}
											Up to {formatNumber(requirements.salary.amountEnd)}
										{/if}

										{#if requirements.salary?.currency}
											<span class="ml-1 font-medium">{requirements.salary.currency}</span>
										{/if}

										{#if requirements.salary?.typeV2}
											{@const periodName = availableSalaryPeriods.find(
												(p) => p.code === requirements?.salary?.typeV2
											)?.name}
											{#if periodName}
												<span class="ml-1 text-sm text-gray-600">({periodName})</span>
											{/if}
										{/if}
									</p>
								{/if}

								{#if requirements.salary?.amountText && !requirements.salary?.salaryExtra}
									<p class="text-gray-900">{requirements.salary.amountText}</p>
								{/if}

								{#if requirements.salary?.salaryExtra}
									<p class="text-sm italic text-gray-600">{requirements.salary.salaryExtra}</p>
								{/if}

								{#if !requirements.salary?.amountStart && !requirements.salary?.amountEnd && !requirements.salary?.amountText && !requirements.salary?.salaryExtra}
									<p class="text-gray-500">{$t('hunt.notSpecified')}</p>
								{/if}
							</div>
						{/if}
					</div>

					<!-- Target countries -->
					<div class="group rounded p-3 hover:bg-gray-50">
						<div class="flex items-center gap-2">
							<p class="text-[11px] uppercase tracking-wide text-muted-foreground">
								{$t('requirementsDetails.fields.targetCountries')}
							</p>
							{#if !editableFields.targetOnlyCountries && !editableFields.targetPreferredCountries}
								<button
									class="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
									onclick={() => {
										editableFields.targetOnlyCountries = true;
										editableFields.targetPreferredCountries = true;
									}}><Pen class="h-3.5 w-3.5 text-gray-600 hover:text-primary" /></button
								>
							{/if}
						</div>
						<div class="mt-2">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-1.5">
									<p class="text-xs text-muted-foreground">
										{$t('requirementsDetails.fields.only')}
									</p>
									<Tooltip.Root>
										<Tooltip.Trigger>
											<button
												type="button"
												aria-label={$t('requirementsDetails.tooltips.onlyCountriesInfo')}
												title={$t('requirementsDetails.tooltips.onlyCountriesInfo')}
												class="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
											>
												<Info class="h-3 w-3" />
											</button>
										</Tooltip.Trigger>
										<Tooltip.Content side="top"
											>{$t(
												'requirementsDetails.tooltips.onlyCountriesDescription'
											)}</Tooltip.Content
										>
									</Tooltip.Root>
								</div>
							</div>

							{#if editableFields.targetOnlyCountries}
								<div class="mt-1 space-y-2">
									<ComboboxMulti
										items={availableCountries.map((c) => ({ value: c.code, label: c.name }))}
										values={editValues.huntOnlyCountries}
										onValuesChange={(vals) => (editValues.huntOnlyCountries = vals)}
										placeholder={$t('requirementsDetails.placeholders.selectOnlyCountries')}
										searchPlaceholder={$t('requirementsDetails.placeholders.searchCountry')}
										emptyText={$t('requirementsDetails.labels.noResults')}
										class="w-full"
									/>
								</div>
							{:else}
								<div class="mt-1 flex flex-wrap gap-1">
									{#each requirements.countriesOnlyToSearch || requirements.huntInstructions?.onlyCountriesToSearch || [] as c}
										<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
											>{availableCountries.find((country) => country.code === c)?.name || c}</span
										>
									{/each}
									{#if (!requirements.countriesOnlyToSearch || requirements.countriesOnlyToSearch.length === 0) && (!requirements.huntInstructions?.onlyCountriesToSearch || requirements.huntInstructions.onlyCountriesToSearch.length === 0)}
										<span class="text-gray-500">{$t('hunt.notSpecified')}</span>
									{/if}
								</div>
							{/if}
						</div>
						<div class="mt-4">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-1.5">
									<p class="text-xs text-muted-foreground">
										{$t('requirementsDetails.fields.preferred')}
									</p>
									<Tooltip.Root>
										<Tooltip.Trigger>
											<button
												type="button"
												aria-label={$t('requirementsDetails.tooltips.preferredCountriesInfo')}
												title={$t('requirementsDetails.tooltips.preferredCountriesInfo')}
												class="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
											>
												<Info class="h-3 w-3" />
											</button>
										</Tooltip.Trigger>
										<Tooltip.Content side="top"
											>{$t(
												'requirementsDetails.tooltips.preferredCountriesDescription'
											)}</Tooltip.Content
										>
									</Tooltip.Root>
								</div>
							</div>

							{#if editableFields.targetPreferredCountries}
								<div class="mt-1 space-y-2">
									<ComboboxMulti
										items={availableCountries.map((c) => ({ value: c.code, label: c.name }))}
										values={editValues.huntPreferredCountries}
										onValuesChange={(vals) => (editValues.huntPreferredCountries = vals)}
										placeholder={$t('requirementsDetails.placeholders.selectPreferredCountries')}
										searchPlaceholder={$t('requirementsDetails.placeholders.searchCountry')}
										emptyText={$t('requirementsDetails.labels.noResults')}
										class="w-full"
									/>
									<div class="flex justify-end gap-2">
										<Button
											size="icon"
											variant="default"
											onclick={() => saveField('targetPreferredCountries')}
											disabled={isSaving}
											>{#if isSaving}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Check
													class="h-4 w-4"
												/>{/if}</Button
										>
										<Button
											size="icon"
											variant="outline"
											onclick={() => {
												cancelEditing('targetOnlyCountries');
												cancelEditing('targetPreferredCountries');
											}}><X class="h-4 w-4" /></Button
										>
									</div>
								</div>
							{:else}
								<div class="mt-1 flex flex-wrap gap-1">
									{#each requirements.countriesPreferredToSearch || requirements.huntInstructions?.preferredCountriesToSearch || [] as c}
										<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
											>{availableCountries.find((country) => country.code === c)?.name || c}</span
										>
									{/each}
									{#if (!requirements.countriesPreferredToSearch || requirements.countriesPreferredToSearch.length === 0) && (!requirements.huntInstructions?.preferredCountriesToSearch || requirements.huntInstructions.preferredCountriesToSearch.length === 0)}
										<span class="text-gray-500">{$t('hunt.notSpecified')}</span>
									{/if}
								</div>
							{/if}
						</div>
					</div>
				</div>

				<!-- Details section (always below header grid in this standalone component) -->
				<div class="mt-6 space-y-6 border-t pt-4">
					<!-- Description -->
					<div class="group w-full max-w-full rounded p-3 hover:bg-gray-50">
						<div class="mb-2 flex items-center gap-2">
							<h4 class="text-base font-medium">{$t('hunt.jobDescription')}</h4>
							{#if !editableFields.jobDescription}
								<button
									class="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
									onclick={() => startEditing('jobDescription')}
									><Pen class="h-3.5 w-3.5 text-gray-600 hover:text-primary" /></button
								>
							{/if}
						</div>
						{#if editableFields.jobDescription}
							<div class="flex w-full flex-col gap-2">
								<MarkdownToolbar
									onBold={descriptionBold}
									onItalic={descriptionItalic}
									onHeading={descriptionHeading}
									onUnorderedList={descriptionUnorderedList}
									onOrderedList={descriptionOrderedList}
									onLink={descriptionLink}
									onCode={descriptionCode}
								/>
								<div
									bind:this={descriptionEditor}
									contenteditable="true"
									onblur={handleDescriptionBlur}
									class="markdown-editor min-h-[250px] w-full max-w-none rounded-md border bg-white p-4 focus:outline-none focus:ring-2 focus:ring-primary"
								></div>
								<div class="flex justify-end gap-2">
									<Button
										size="icon"
										variant="default"
										onclick={() => saveField('jobDescription')}
										disabled={isSaving}
										>{#if isSaving}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Check
												class="h-4 w-4"
											/>{/if}</Button
									>
									<Button
										size="icon"
										variant="outline"
										onclick={() => cancelEditing('jobDescription')}><X class="h-4 w-4" /></Button
									>
								</div>
							</div>
						{:else}
							<div
								class="w-full max-w-full overflow-hidden {requirements.jobDescription
									? 'prose max-w-none text-sm text-gray-900'
									: 'text-gray-500'}"
							>
								{@html mdToHtml(requirements.jobDescription || $t('hunt.notSpecified'))}
							</div>
						{/if}
					</div>

					<!-- Qualifications -->
					<div class="group w-full max-w-full rounded p-3 hover:bg-gray-50">
						<div class="mb-2 flex items-center gap-2">
							<h4 class="text-base font-medium">{$t('hunt.requiredQualifications')}</h4>
							{#if !editableFields.jobRequiredQualifications}
								<button
									class="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
									onclick={() => startEditing('jobRequiredQualifications')}
									><Pen class="h-3.5 w-3.5 text-gray-600 hover:text-primary" /></button
								>
							{/if}
						</div>
						{#if editableFields.jobRequiredQualifications}
							<div class="flex w-full flex-col gap-2">
								<MarkdownToolbar
									onBold={qualificationsBold}
									onItalic={qualificationsItalic}
									onHeading={qualificationsHeading}
									onUnorderedList={qualificationsUnorderedList}
									onOrderedList={qualificationsOrderedList}
									onLink={qualificationsLink}
									onCode={qualificationsCode}
								/>
								<div
									bind:this={qualificationsEditor}
									contenteditable="true"
									onblur={handleQualificationsBlur}
									class="markdown-editor min-h-[200px] w-full max-w-none rounded-md border bg-white p-4 focus:outline-none focus:ring-2 focus:ring-primary"
								></div>
								<div class="flex justify-end gap-2">
									<Button
										size="icon"
										variant="default"
										onclick={() => saveField('jobRequiredQualifications')}
										disabled={isSaving}
										>{#if isSaving}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Check
												class="h-4 w-4"
											/>{/if}</Button
									>
									<Button
										size="icon"
										variant="outline"
										onclick={() => cancelEditing('jobRequiredQualifications')}
										><X class="h-4 w-4" /></Button
									>
								</div>
							</div>
						{:else}
							<div
								class="w-full max-w-full overflow-hidden {requirements.jobRequiredQualifications
									? 'prose max-w-none text-sm text-gray-900'
									: 'text-gray-500'}"
							>
								{@html mdToHtml(requirements.jobRequiredQualifications || $t('hunt.notSpecified'))}
							</div>
						{/if}
					</div>

					<!-- Contexts -->
					<div class="group w-full max-w-full rounded p-3 hover:bg-gray-50">
						<div class="mb-2 flex items-center gap-2">
							<h4 class="text-base font-medium">
								{$t('requirementsDetails.fields.companyContext')}
							</h4>
							{#if !editableFields.companyContext}
								<button
									class="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
									onclick={() => startEditing('companyContext')}
									><Pen class="h-3.5 w-3.5 text-gray-600 hover:text-primary" /></button
								>
							{/if}
						</div>
						{#if editableFields.companyContext}
							<div class="flex w-full flex-col gap-2">
								<textarea
									value={editValues.companyContext}
									onchange={(e: Event & { currentTarget: HTMLTextAreaElement }) =>
										(editValues.companyContext = e.currentTarget.value)}
									class="min-h-[80px] w-full rounded-md border p-2 text-sm"
								></textarea>
								<div class="flex justify-end gap-2">
									<Button
										size="icon"
										variant="default"
										onclick={() => saveField('companyContext')}
										disabled={isSaving}
										>{#if isSaving}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Check
												class="h-4 w-4"
											/>{/if}</Button
									>
									<Button
										size="icon"
										variant="outline"
										onclick={() => cancelEditing('companyContext')}><X class="h-4 w-4" /></Button
									>
								</div>
							</div>
						{:else}
							<div
								class="w-full max-w-full overflow-hidden {requirements.companyContext ||
								requirements.huntInstructions?.companyContext
									? 'whitespace-pre-line text-sm text-gray-900'
									: 'text-sm text-gray-500'}"
							>
								<div class="max-w-full overflow-x-auto break-all">
									{requirements.companyContext ||
										requirements.huntInstructions?.companyContext ||
										$t('requirementsDetails.labels.notProvided')}
								</div>
							</div>
						{/if}
					</div>

					<div class="group w-full max-w-full rounded p-3 hover:bg-gray-50">
						<div class="mb-2 flex items-center gap-2">
							<h4 class="text-base font-medium">
								{$t('requirementsDetails.fields.hiringContext')}
							</h4>
							{#if !editableFields.hiringContext}
								<button
									class="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
									onclick={() => startEditing('hiringContext')}
									><Pen class="h-3.5 w-3.5 text-gray-600 hover:text-primary" /></button
								>
							{/if}
						</div>
						{#if editableFields.hiringContext}
							<div class="flex w-full flex-col gap-2">
								<textarea
									value={editValues.hiringContext}
									onchange={(e: Event & { currentTarget: HTMLTextAreaElement }) =>
										(editValues.hiringContext = e.currentTarget.value)}
									class="min-h-[80px] w-full rounded-md border p-2 text-sm"
								></textarea>
								<div class="flex justify-end gap-2">
									<Button
										size="icon"
										variant="default"
										onclick={() => saveField('hiringContext')}
										disabled={isSaving}
										>{#if isSaving}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Check
												class="h-4 w-4"
											/>{/if}</Button
									>
									<Button
										size="icon"
										variant="outline"
										onclick={() => cancelEditing('hiringContext')}><X class="h-4 w-4" /></Button
									>
								</div>
							</div>
						{:else}
							<div
								class="w-full max-w-full overflow-hidden {requirements.hiringContext ||
								requirements.huntInstructions?.hiringContext
									? 'whitespace-pre-line text-sm text-gray-900'
									: 'text-sm text-gray-500'}"
							>
								<div class="max-w-full overflow-x-auto break-all">
									{requirements.hiringContext ||
										requirements.huntInstructions?.hiringContext ||
										$t('requirementsDetails.labels.notProvided')}
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Markdown editor styles - using :global to ensure proper specificity */
	:global(.markdown-editor) {
		font-size: 16px;
		line-height: 1.6;
		color: #1f2937;
	}

	:global(.markdown-editor:focus) {
		outline: none;
	}

	:global(.markdown-editor h1) {
		font-size: 2em;
		font-weight: 700;
		line-height: 1.2;
		margin-top: 0.67em;
		margin-bottom: 0.67em;
		color: #111827;
	}

	:global(.markdown-editor h2) {
		font-size: 1.5em;
		font-weight: 600;
		line-height: 1.3;
		margin-top: 0.83em;
		margin-bottom: 0.83em;
		color: #111827;
	}

	:global(.markdown-editor h3) {
		font-size: 1.25em;
		font-weight: 600;
		line-height: 1.4;
		margin-top: 1em;
		margin-bottom: 1em;
		color: #111827;
	}

	:global(.markdown-editor ul) {
		list-style-type: disc;
		list-style-position: outside;
		margin-left: 1.5em;
		margin-top: 0.5em;
		margin-bottom: 0.5em;
		padding-left: 0.5em;
	}

	:global(.markdown-editor ol) {
		list-style-type: decimal;
		list-style-position: outside;
		margin-left: 1.5em;
		margin-top: 0.5em;
		margin-bottom: 0.5em;
		padding-left: 0.5em;
	}

	:global(.markdown-editor li) {
		display: list-item;
		margin-bottom: 0.25em;
		line-height: 1.6;
	}

	:global(.markdown-editor p) {
		margin-bottom: 0.75em;
		line-height: 1.6;
	}

	:global(.markdown-editor strong),
	:global(.markdown-editor b) {
		font-weight: 700;
	}

	:global(.markdown-editor em),
	:global(.markdown-editor i) {
		font-style: italic;
	}

	:global(.markdown-editor code) {
		background-color: #f3f4f6;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.875em;
		color: #dc2626;
	}

	:global(.markdown-editor a) {
		color: #2563eb;
		text-decoration: underline;
	}

	:global(.markdown-editor a:hover) {
		color: #1d4ed8;
	}

	/* Ensure empty elements are visible */
	:global(.markdown-editor p:empty:before),
	:global(.markdown-editor li:empty:before) {
		content: '\200B'; /* Zero-width space */
	}
</style>
