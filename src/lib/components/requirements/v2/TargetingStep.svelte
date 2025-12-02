<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { ComboboxMulti } from '$lib/components/ui/combobox-multi';
	import { scrubinClient } from '@/scrubinClient/client';
	import type { JobRequirementDto, CodeNamePair } from '@/scrubinClient';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Target, Globe, Info } from 'lucide-svelte';
	import { locale } from '$lib/i18n';
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
	let preferredCountries = $state<string[]>(
		requirement.countriesPreferredToSearch ||
			requirement.huntInstructions?.preferredCountriesToSearch ||
			[]
	);
	let onlyCountries = $state<string[]>(
		requirement.countriesOnlyToSearch || requirement.huntInstructions?.onlyCountriesToSearch || []
	);
	let companyContext = $state(
		requirement.companyContext || requirement.huntInstructions?.companyContext || ''
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
				updateData.countriesPreferredToSearch = preferredCountries;
				updateData.countriesOnlyToSearch = onlyCountries;
			} else if (field === 'context') {
				updateData.companyContext = companyContext;
				updateData.hiringContext = hiringContext;
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

	function handleContextBlur() {
		saveField('context');
	}

	$effect(() => {
		if (
			JSON.stringify(preferredCountries) !==
				JSON.stringify(
					requirement.countriesPreferredToSearch ||
						requirement.huntInstructions?.preferredCountriesToSearch ||
						[]
				) ||
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

<div class="space-y-8">
	<div>
		<h2 class="mb-2 text-2xl font-semibold">Candidate Targeting</h2>
		<p class="text-sm text-muted-foreground">
			Configure search preferences to find the most relevant candidates.
		</p>
	</div>

	<!-- Target Countries Section -->
	<div class="space-y-6 rounded-lg border border-gray-200 bg-gray-50 p-6">
		<div class="flex items-center gap-2">
			<Globe class="h-5 w-5 text-primary" />
			<h3 class="text-lg font-semibold">Geographic Targeting</h3>
		</div>

		<!-- Preferred Countries -->
		<div class="space-y-3">
			<div>
				<Label class="text-base font-medium">Preferred Countries</Label>
				<p class="mt-1 text-sm text-muted-foreground">
					Countries where you'd <strong>prefer</strong> to search for candidates. Candidates from
					these countries will be prioritized in search results.
				</p>
			</div>
			<ComboboxMulti
				items={availableCountries.map((c) => ({ value: c.code, label: c.name }))}
				values={preferredCountries}
				onValuesChange={(vals) => (preferredCountries = vals)}
				placeholder="Select preferred countries..."
				searchPlaceholder="Search countries..."
				emptyText="No countries found"
				class="w-full bg-white"
			/>
			{#if preferredCountries.length > 0}
				<div class="flex flex-wrap gap-2 pt-2">
					{#each preferredCountries as countryCode}
						<span class="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
							{availableCountries.find((c) => c.code === countryCode)?.name || countryCode}
						</span>
					{/each}
				</div>
			{/if}
			<div class="flex gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
				<Info class="mt-0.5 h-4 w-4 flex-shrink-0" />
				<p>
					Selecting preferred countries helps us prioritize candidates from these locations, but
					we'll still search globally.
				</p>
			</div>
		</div>

		<!-- Only Countries -->
		<div class="space-y-3">
			<div>
				<Label class="text-base font-medium">Only Search in Countries</Label>
				<p class="mt-1 text-sm text-muted-foreground">
					Restrict the search to <strong>only</strong> these countries. If specified, candidates from
					other countries will not be included.
				</p>
			</div>
			<ComboboxMulti
				items={availableCountries.map((c) => ({ value: c.code, label: c.name }))}
				values={onlyCountries}
				onValuesChange={(vals) => (onlyCountries = vals)}
				placeholder="Select countries to restrict search (optional)..."
				searchPlaceholder="Search countries..."
				emptyText="No countries found"
				class="w-full bg-white"
			/>
			{#if onlyCountries.length > 0}
				<div class="flex flex-wrap gap-2 pt-2">
					{#each onlyCountries as countryCode}
						<span class="rounded-full bg-purple-50 px-3 py-1 text-sm text-purple-700">
							{availableCountries.find((c) => c.code === countryCode)?.name || countryCode}
						</span>
					{/each}
				</div>
			{/if}
			<div class="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
				<Info class="mt-0.5 h-4 w-4 flex-shrink-0" />
				<p>
					<strong>Warning:</strong> Restricting to specific countries may significantly limit your candidate
					pool. Leave empty to search globally.
				</p>
			</div>
		</div>
	</div>

	<!-- Context Section -->
	<div class="space-y-6 rounded-lg border border-gray-200 bg-gray-50 p-6">
		<div class="flex items-center gap-2">
			<Target class="h-5 w-5 text-primary" />
			<h3 class="text-lg font-semibold">Additional Context</h3>
		</div>

		<!-- Company Context -->
		<div class="space-y-3">
			<div>
				<Label for="companyContext" class="text-base font-medium">Company Context</Label>
				<p class="mt-1 text-sm text-muted-foreground">
					Provide context about your company that helps candidates understand your organization.
					This information helps our AI match you with candidates who align with your company
					culture.
				</p>
			</div>
			<textarea
				id="companyContext"
				bind:value={companyContext}
				onblur={handleContextBlur}
				placeholder="Describe your company, industry, size, culture, values, mission, and what makes it a great place to work.

Example:
We're a fast-growing healthcare technology startup with 50+ employees across Europe. We're passionate about improving patient care through innovative software solutions. Our culture values work-life balance, continuous learning, and collaborative problem-solving..."
				class="min-h-[150px] w-full rounded-md border bg-white p-4 text-base focus:outline-none focus:ring-2 focus:ring-primary"
				rows="6"
			></textarea>
		</div>

		<!-- Hiring Context -->
		<div class="space-y-3">
			<div>
				<Label for="hiringContext" class="text-base font-medium">Hiring Context</Label>
				<p class="mt-1 text-sm text-muted-foreground">
					Explain why you're hiring and what the role means for your team. This helps us find
					candidates who are the right fit for this specific opportunity.
				</p>
			</div>
			<textarea
				id="hiringContext"
				bind:value={hiringContext}
				onblur={handleContextBlur}
				placeholder="Explain why this position exists, team structure, growth opportunities, and what success looks like in this role.

Example:
We're expanding our engineering team to support our new product launch. The ideal candidate will work closely with our product and design teams to build features that will serve thousands of healthcare providers. This is a high-impact role with significant growth potential..."
				class="min-h-[150px] w-full rounded-md border bg-white p-4 text-base focus:outline-none focus:ring-2 focus:ring-primary"
				rows="6"
			></textarea>
		</div>
	</div>

	<!-- Info box -->
	<div class="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
		<Info class="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
		<div class="text-sm text-blue-900">
			<p class="font-medium">How targeting works</p>
			<p class="mt-1">
				Our AI uses all the information you provide to find and rank candidates. Better targeting
				and context leads to better matches. Don't worry about being too specific - you can always
				adjust these settings later.
			</p>
		</div>
	</div>
</div>
