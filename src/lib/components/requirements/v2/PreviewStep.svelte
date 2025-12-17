<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { scrubinClient } from '@/scrubinClient/client';
	import type { JobRequirementDto } from '@/scrubinClient';
	import { onMount } from 'svelte';
	import {
		Briefcase,
		MapPin,
		DollarSign,
		GraduationCap,
		Globe,
		Users,
		Building,
		Target,
		AlertCircle,
		CheckCircle
	} from 'lucide-svelte';
	import { locale, t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import { markdownToHtml } from '$lib/components/ui/markdown-toolbar/markdownEditor';
	import type { CodeNamePair } from '@/scrubinClient/models';

	let {
		requirement,
		requirementId
	}: {
		requirement: JobRequirementDto;
		requirementId: number;
	} = $props();

	let availableCountries = $state<CodeNamePair[]>([]);
	let availableProfessions = $state<CodeNamePair[]>([]);
	let availableSpecialties = $state<CodeNamePair[]>([]);
	let availableLanguages = $state<CodeNamePair[]>([]);
	let availableSalaryPeriods = $state<CodeNamePair[]>([]);

	onMount(async () => {
		const lang = get(locale);
		const [countries, professions, specialties, languages, salaryPeriods] = await Promise.all([
			scrubinClient.data.getCountries(lang),
			scrubinClient.data.getProfessions(lang),
			scrubinClient.data.getSpecialties(lang),
			scrubinClient.data.getLanguages(lang),
			scrubinClient.data.getSalaryPeriods(lang)
		]);
		availableCountries = countries;
		availableProfessions = professions;
		availableSpecialties = specialties;
		availableLanguages = languages;
		availableSalaryPeriods = salaryPeriods;
	});

	function hasMarkdownSyntax(text: string): boolean {
		if (!text) return false;
		// Check for common markdown patterns
		const markdownPatterns = [
			/^#{1,6}\s/m, // Headers
			/\*\*.*\*\*/, // Bold
			/__.*__/, // Bold alternative
			/\*[^*]+\*/, // Italic (but not standalone *)
			/_[^_]+_/, // Italic alternative
			/\[.*\]\(.*\)/, // Links
			/^[-*+]\s+\S/m, // Unordered lists (- or * followed by space and non-whitespace)
			/^\d+\.\s+\S/m, // Ordered lists
			/```[\s\S]*```/, // Code blocks
			/`[^`]+`/, // Inline code
			/^>\s/m, // Blockquotes
			/\|.*\|/ // Tables
		];

		return markdownPatterns.some((pattern) => pattern.test(text));
	}

	function formatNumber(num: number): string {
		return num >= 1000 ? num.toLocaleString('en-US').replace(/,/g, ' ') : num.toString();
	}

	function getCountryName(code: string): string {
		return availableCountries.find((c) => c.code === code)?.name || code;
	}

	function getProfessionName(id: number): string {
		return availableProfessions.find((p) => Number(p.code) === id)?.name || String(id);
	}

	function getSpecialtyName(id: number): string {
		return availableSpecialties.find((s) => Number(s.code) === id)?.name || String(id);
	}

	function getLanguageName(code: string): string {
		return availableLanguages.find((l) => l.code === code)?.name || code;
	}

	function getSalaryPeriodName(code: string): string {
		return availableSalaryPeriods.find((p) => p.code === code)?.name || code;
	}

	// Check completeness
	const isComplete = $derived(
		!!(
			requirement.jobTitle &&
			requirement.professionsV2?.length &&
			requirement.country &&
			requirement.jobDescription
		)
	);

	const missingFields = $derived(() => {
		const missing: string[] = [];
		if (!requirement.jobTitle) missing.push($t('requirementsV2.preview.missingFields.jobTitle'));
		if (!requirement.professionsV2?.length)
			missing.push($t('requirementsV2.preview.missingFields.professions'));
		if (!requirement.country) missing.push($t('requirementsV2.preview.missingFields.country'));
		if (!requirement.jobDescription)
			missing.push($t('requirementsV2.preview.missingFields.jobDescription'));
		return missing;
	});
</script>

<div class="w-full space-y-4">
	<div class="space-y-0.5">
		<h2 class="text-xl font-semibold">{$t('requirementsV2.steps.preview.heading')}</h2>
		<p class="text-xs text-muted-foreground">
			{$t('requirementsV2.steps.preview.subheading')}
		</p>
	</div>

	<!-- Completeness Status -->
	{#if isComplete}
		<div class="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
			<CheckCircle class="h-6 w-6 text-green-600" />
			<div>
				<p class="font-semibold text-green-900">
					{$t('requirementsV2.preview.readyToActivate.title')}
				</p>
				<p class="text-sm text-green-700">
					{$t('requirementsV2.preview.readyToActivate.description')}
				</p>
			</div>
		</div>
	{:else}
		<div class="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
			<AlertCircle class="h-6 w-6 text-amber-600" />
			<div>
				<p class="font-semibold text-amber-900">{$t('requirementsV2.preview.missingInfo.title')}</p>
				<p class="text-sm text-amber-700">
					{$t('requirementsV2.preview.missingInfo.description')}
					<strong>{missingFields().join(', ')}</strong>
				</p>
			</div>
		</div>
	{/if}

	<!-- Job Overview -->
	<div class="w-full space-y-3">
		<h3 class="text-base font-semibold">{$t('requirementsV2.preview.jobOverview')}</h3>
		<Separator />

		<div class="space-y-3">
			<div>
				<p class="text-sm font-medium text-muted-foreground">
					{$t('requirementsV2.preview.fields.jobTitle')}
				</p>
				<p class="text-lg font-semibold">
					{#if requirement.jobTitle}
						{requirement.jobTitle}
					{:else}
						<span class="text-muted-foreground">{$t('requirementsV2.preview.notSpecified')}</span>
					{/if}
				</p>
			</div>

			{#if requirement.professionsV2?.length}
				<div>
					<p class="text-sm font-medium text-muted-foreground">
						{$t('requirementsV2.preview.fields.professions')}
					</p>
					<div class="mt-1 flex flex-wrap gap-2">
						{#each requirement.professionsV2 as profId}
							<Badge variant="secondary">{getProfessionName(profId)}</Badge>
						{/each}
					</div>
				</div>
			{/if}

			{#if requirement.specializationV2}
				<div>
					<p class="text-sm font-medium text-muted-foreground">
						{$t('requirementsV2.preview.fields.specialization')}
					</p>
					<Badge variant="outline">{getSpecialtyName(requirement.specializationV2)}</Badge>
				</div>
			{/if}

			{#if requirement.jobRequiredWorkExperience}
				<div>
					<p class="text-sm font-medium text-muted-foreground">
						{$t('requirementsV2.preview.fields.requiredExperience')}
					</p>
					<p class="text-base">
						{requirement.jobRequiredWorkExperience}
						{$t('requirementsV2.preview.years')}
					</p>
				</div>
			{/if}

			{#if requirement.jobRequiredLanguages?.length}
				<div>
					<p class="text-sm font-medium text-muted-foreground">
						{$t('requirementsV2.preview.fields.requiredLanguages')}
					</p>
					<div class="mt-1 flex flex-wrap gap-2">
						{#each requirement.jobRequiredLanguages as langCode}
							<Badge variant="secondary">{getLanguageName(langCode)}</Badge>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Location & Salary -->
	<div class="grid w-full gap-4 md:grid-cols-2">
		<!-- Location -->
		<div class="w-full space-y-3">
			<h3 class="text-base font-semibold">{$t('requirementsV2.preview.locationSection')}</h3>
			<Separator />
			<div class="space-y-2">
				{#if requirement.country}
					<p class="text-base">
						<span class="font-medium">{getCountryName(requirement.country)}</span>
					</p>
				{/if}
				{#if requirement.address?.city}
					<p class="text-sm text-muted-foreground">{requirement.address.city}</p>
				{/if}
				{#if requirement.address?.stateProvinceRegion}
					<p class="text-sm text-muted-foreground">
						{Array.isArray(requirement.address.stateProvinceRegion)
							? requirement.address.stateProvinceRegion.join(', ')
							: requirement.address.stateProvinceRegion}
					</p>
				{/if}
			</div>
		</div>

		<!-- Salary -->
		<div class="w-full space-y-3">
			<h3 class="text-base font-semibold">{$t('requirementsV2.preview.compensationSection')}</h3>
			<Separator />
			<div class="space-y-2">
				{#if requirement.salary?.amountStart || requirement.salary?.amountEnd}
					<p class="text-base font-semibold">
						{#if requirement.salary?.amountStart && requirement.salary?.amountEnd}
							{formatNumber(requirement.salary.amountStart)} - {formatNumber(
								requirement.salary.amountEnd
							)}
						{:else if requirement.salary?.amountStart}
							{formatNumber(requirement.salary.amountStart)}+
						{:else if requirement.salary?.amountEnd}
							Up to {formatNumber(requirement.salary.amountEnd)}
						{/if}
						{requirement.salary?.currency || ''}
					</p>
					{#if requirement.salary?.typeV2}
						<p class="text-sm text-muted-foreground">
							{getSalaryPeriodName(requirement.salary.typeV2)}
						</p>
					{/if}
				{:else}
					<p class="text-muted-foreground">{$t('requirementsV2.preview.notSpecified')}</p>
				{/if}
				{#if requirement.salary?.salaryExtra}
					<p class="text-sm italic text-muted-foreground">{requirement.salary.salaryExtra}</p>
				{/if}
			</div>
		</div>
	</div>

	<!-- Job Details -->
	{#if requirement.jobDescription || requirement.jobRequiredQualifications}
		<div class="w-full space-y-3">
			<div class="flex items-center gap-2">
				<GraduationCap class="h-4 w-4 text-primary" />
				<h3 class="text-base font-semibold">{$t('requirementsV2.preview.jobDetailsSection')}</h3>
			</div>
			<Separator />

		
			{#if requirement.jobDescription}
				<div>
					<p class="mb-4 text-sm font-medium">
						{$t('requirementsV2.preview.fields.description')}
					</p>
					{#if hasMarkdownSyntax(requirement.jobDescription)}
						<div class="prose max-w-none text-sm">
							{@html markdownToHtml(requirement.jobDescription)}
						</div>
					{:else}
						<div class="whitespace-pre-line text-sm">{requirement.jobDescription}</div>
					{/if}
				</div>
			{/if}

			{#if requirement.jobRequiredQualifications}
				<div>
					<p class="pt-8 mb-4 text-sm font-medium">
						{$t('requirementsV2.preview.fields.requiredQualifications')}
					</p>
					{#if hasMarkdownSyntax(requirement.jobRequiredQualifications)}
						<div class="prose max-w-none text-sm">
							{@html markdownToHtml(requirement.jobRequiredQualifications)}
						</div>
					{:else}
						<div class="whitespace-pre-line text-sm">{requirement.jobRequiredQualifications}</div>
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Targeting -->
	{#if requirement.countriesPreferredToSearch?.length || requirement.countriesOnlyToSearch?.length || requirement.companyContext || requirement.hiringContext}
		<div class="w-full space-y-3 rounded-lg border bg-white p-4 shadow-sm">
			<div class="flex items-center gap-2">
				<Target class="h-4 w-4 text-primary" />
				<h3 class="text-base font-semibold">{$t('requirementsV2.preview.targetingSection')}</h3>
			</div>
			<Separator />

			{#if requirement.countriesPreferredToSearch?.length}
				<div>
					<p class="mb-2 text-sm font-medium text-muted-foreground">
						{$t('requirementsV2.preview.fields.preferredCountries')}
					</p>
					<div class="flex flex-wrap gap-2">
						{#each requirement.countriesPreferredToSearch as countryCode}
							<Badge variant="secondary">{getCountryName(countryCode)}</Badge>
						{/each}
					</div>
				</div>
			{/if}

			{#if requirement.countriesOnlyToSearch?.length}
				<div>
					<p class="mb-2 text-sm font-medium text-muted-foreground">
						{$t('requirementsV2.preview.fields.onlySearchIn')}
					</p>
					<div class="flex flex-wrap gap-2">
						{#each requirement.countriesOnlyToSearch as countryCode}
							<Badge variant="outline">{getCountryName(countryCode)}</Badge>
						{/each}
					</div>
				</div>
			{/if}

			{#if requirement.companyContext}
				<div>
					<p class="mb-2 text-sm font-medium text-muted-foreground">
						{$t('requirementsV2.preview.fields.companyContext')}
					</p>
					<p class="whitespace-pre-line text-sm">{requirement.companyContext}</p>
				</div>
			{/if}

			{#if requirement.hiringContext}
				<div>
					<p class="mb-2 text-sm font-medium text-muted-foreground">
						{$t('requirementsV2.preview.fields.hiringContext')}
					</p>
					<p class="whitespace-pre-line text-sm">{requirement.hiringContext}</p>
				</div>
			{/if}
		</div>
	{/if}
</div>
