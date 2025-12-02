<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { scrubinClient } from '@/scrubinClient/client';
	import type { JobRequirementDto, CodeNamePair } from '@/scrubinClient';
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
	import { locale } from '$lib/i18n';
	import { get } from 'svelte/store';
	import showdown from 'showdown';

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
	let potentialReach = $state<number | null>(null);
	let isLoadingReach = $state(true);

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

		// Load potential reach
		try {
			const reach = await scrubinClient.hunt.getRequirementReach(requirementId);
			potentialReach = reach.potentialReach;
		} catch (error) {
			console.error('Failed to load potential reach:', error);
		} finally {
			isLoadingReach = false;
		}
	});

	function markdownToHtml(markdown: string): string {
		if (!markdown) return '';
		const converter = new showdown.Converter({ flavor: 'github' });
		converter.setOption('simpleLineBreaks', true);
		return converter.makeHtml(markdown);
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
		if (!requirement.jobTitle) missing.push('Job Title');
		if (!requirement.professionsV2?.length) missing.push('Professions');
		if (!requirement.country) missing.push('Country');
		if (!requirement.jobDescription) missing.push('Job Description');
		return missing;
	});
</script>

<div class="space-y-8">
	<div>
		<h2 class="mb-2 text-2xl font-semibold">Review Your Job Hunt</h2>
		<p class="text-sm text-muted-foreground">
			Review all the details before activating your hunt. You can go back to any step to make
			changes.
		</p>
	</div>

	<!-- Completeness Status -->
	{#if isComplete}
		<div class="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
			<CheckCircle class="h-6 w-6 text-green-600" />
			<div>
				<p class="font-semibold text-green-900">Ready to activate!</p>
				<p class="text-sm text-green-700">
					All required information has been provided. Click "Activate Hunt" to start finding
					candidates.
				</p>
			</div>
		</div>
	{:else}
		<div class="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
			<AlertCircle class="h-6 w-6 text-amber-600" />
			<div>
				<p class="font-semibold text-amber-900">Missing required information</p>
				<p class="text-sm text-amber-700">
					Please complete the following: <strong>{missingFields().join(', ')}</strong>
				</p>
			</div>
		</div>
	{/if}

	<!-- Potential Reach -->
	{#if potentialReach !== null && !isLoadingReach}
		<div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
			<div class="flex items-center gap-3">
				<Users class="h-6 w-6 text-blue-600" />
				<div>
					<p class="font-semibold text-blue-900">Potential Candidate Reach</p>
					<p class="text-2xl font-bold text-blue-600">{formatNumber(potentialReach)}</p>
					<p class="text-sm text-blue-700">
						candidates match your requirements and will be notified about this opportunity
					</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Job Overview -->
	<div class="space-y-4 rounded-lg border bg-white p-6 shadow-sm">
		<div class="flex items-center gap-2">
			<Briefcase class="h-5 w-5 text-primary" />
			<h3 class="text-xl font-semibold">Job Overview</h3>
		</div>
		<Separator />

		<div class="space-y-4">
			<div>
				<p class="text-sm font-medium text-muted-foreground">Job Title</p>
				<p class="text-lg font-semibold">
					{#if requirement.jobTitle}
						{requirement.jobTitle}
					{:else}
						<span class="text-muted-foreground">Not specified</span>
					{/if}
				</p>
			</div>

			{#if requirement.professionsV2?.length}
				<div>
					<p class="text-sm font-medium text-muted-foreground">Professions</p>
					<div class="mt-1 flex flex-wrap gap-2">
						{#each requirement.professionsV2 as profId}
							<Badge variant="secondary">{getProfessionName(profId)}</Badge>
						{/each}
					</div>
				</div>
			{/if}

			{#if requirement.specializationV2}
				<div>
					<p class="text-sm font-medium text-muted-foreground">Specialization</p>
					<Badge variant="outline">{getSpecialtyName(requirement.specializationV2)}</Badge>
				</div>
			{/if}

			{#if requirement.jobRequiredWorkExperience}
				<div>
					<p class="text-sm font-medium text-muted-foreground">Required Experience</p>
					<p class="text-base">{requirement.jobRequiredWorkExperience} years</p>
				</div>
			{/if}

			{#if requirement.jobRequiredLanguages?.length}
				<div>
					<p class="text-sm font-medium text-muted-foreground">Required Languages</p>
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
	<div class="grid gap-4 md:grid-cols-2">
		<!-- Location -->
		<div class="space-y-4 rounded-lg border bg-white p-6 shadow-sm">
			<div class="flex items-center gap-2">
				<MapPin class="h-5 w-5 text-primary" />
				<h3 class="text-lg font-semibold">Location</h3>
			</div>
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
		<div class="space-y-4 rounded-lg border bg-white p-6 shadow-sm">
			<div class="flex items-center gap-2">
				<DollarSign class="h-5 w-5 text-primary" />
				<h3 class="text-lg font-semibold">Compensation</h3>
			</div>
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
					<p class="text-muted-foreground">Not specified</p>
				{/if}
				{#if requirement.salary?.salaryExtra}
					<p class="text-sm italic text-muted-foreground">{requirement.salary.salaryExtra}</p>
				{/if}
			</div>
		</div>
	</div>

	<!-- Job Details -->
	{#if requirement.jobDescription || requirement.jobRequiredQualifications}
		<div class="space-y-4 rounded-lg border bg-white p-6 shadow-sm">
			<div class="flex items-center gap-2">
				<GraduationCap class="h-5 w-5 text-primary" />
				<h3 class="text-lg font-semibold">Job Details</h3>
			</div>
			<Separator />

			{#if requirement.jobDescription}
				<div>
					<p class="mb-2 text-sm font-medium text-muted-foreground">Description</p>
					<div class="prose max-w-none text-sm">
						{@html markdownToHtml(requirement.jobDescription)}
					</div>
				</div>
			{/if}

			{#if requirement.jobRequiredQualifications}
				<div>
					<p class="mb-2 text-sm font-medium text-muted-foreground">Required Qualifications</p>
					<div class="whitespace-pre-line text-sm">{requirement.jobRequiredQualifications}</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Targeting -->
	{#if requirement.countriesPreferredToSearch?.length || requirement.countriesOnlyToSearch?.length || requirement.companyContext || requirement.hiringContext}
		<div class="space-y-4 rounded-lg border bg-white p-6 shadow-sm">
			<div class="flex items-center gap-2">
				<Target class="h-5 w-5 text-primary" />
				<h3 class="text-lg font-semibold">Targeting & Context</h3>
			</div>
			<Separator />

			{#if requirement.countriesPreferredToSearch?.length}
				<div>
					<p class="mb-2 text-sm font-medium text-muted-foreground">Preferred Countries</p>
					<div class="flex flex-wrap gap-2">
						{#each requirement.countriesPreferredToSearch as countryCode}
							<Badge variant="secondary">{getCountryName(countryCode)}</Badge>
						{/each}
					</div>
				</div>
			{/if}

			{#if requirement.countriesOnlyToSearch?.length}
				<div>
					<p class="mb-2 text-sm font-medium text-muted-foreground">Only Search In</p>
					<div class="flex flex-wrap gap-2">
						{#each requirement.countriesOnlyToSearch as countryCode}
							<Badge variant="outline">{getCountryName(countryCode)}</Badge>
						{/each}
					</div>
				</div>
			{/if}

			{#if requirement.companyContext}
				<div>
					<p class="mb-2 text-sm font-medium text-muted-foreground">Company Context</p>
					<p class="whitespace-pre-line text-sm">{requirement.companyContext}</p>
				</div>
			{/if}

			{#if requirement.hiringContext}
				<div>
					<p class="mb-2 text-sm font-medium text-muted-foreground">Hiring Context</p>
					<p class="whitespace-pre-line text-sm">{requirement.hiringContext}</p>
				</div>
			{/if}
		</div>
	{/if}
</div>
