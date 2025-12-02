<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Combobox } from '$lib/components/ui/combobox';
	import DropdownComponent from '$lib/components/dropdownComponent.svelte';
	import { scrubinClient } from '@/scrubinClient/client';
	import type { JobRequirementDto, CodeNamePair } from '@/scrubinClient';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { MapPin, DollarSign, Info } from 'lucide-svelte';
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
	let availableCurrencies = $state<CodeNamePair[]>([]);
	let availableSalaryPeriods = $state<CodeNamePair[]>([]);
	let isSaving = $state(false);

	// Local state for form fields
	let country = $state(requirement.country || '');
	let city = $state(requirement.address?.city || '');
	let stateProvinceRegion = $state(
		Array.isArray(requirement.address?.stateProvinceRegion)
			? requirement.address.stateProvinceRegion.join(', ')
			: requirement.address?.stateProvinceRegion || ''
	);
	let address = $state(requirement.address?.address || '');

	let salaryStart = $state(requirement.salary?.amountStart || 0);
	let salaryEnd = $state(requirement.salary?.amountEnd || 0);
	let salaryCurrency = $state(requirement.salary?.currency || '');
	let salaryType = $state(requirement.salary?.typeV2 || requirement.salary?.type || '');
	let salaryExtra = $state(requirement.salary?.salaryExtra || '');

	onMount(async () => {
		const lang = get(locale);
		const [countries, currencies, salaryPeriods] = await Promise.all([
			scrubinClient.data.getCountries(lang),
			scrubinClient.data.getCurrencies(lang),
			scrubinClient.data.getSalaryPeriods(lang)
		]);
		availableCountries = countries;
		availableCurrencies = currencies;
		availableSalaryPeriods = salaryPeriods;
	});

	async function saveField(field: string) {
		if (!requirementId || isSaving) return;

		isSaving = true;
		try {
			const updateData: any = {};

			if (field === 'location') {
				updateData.country = country;
				updateData.city = city;
				updateData.stateProvinceRegion = stateProvinceRegion
					.split(',')
					.map((s) => s.trim())
					.filter(Boolean);
				updateData.address = address;
			} else if (field === 'salary') {
				updateData.salaryAmountStart = salaryStart;
				updateData.salaryAmountEnd = salaryEnd;
				updateData.salaryCurrency = salaryCurrency;
				updateData.salaryType = salaryType;
				updateData.salaryExtra = salaryExtra;
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

	function handleLocationBlur() {
		saveField('location');
	}

	function handleSalaryBlur() {
		saveField('salary');
	}
</script>

<div class="space-y-8">
	<div>
		<h2 class="mb-2 text-2xl font-semibold">Location & Compensation</h2>
		<p class="text-sm text-muted-foreground">
			Specify where the job is located and the compensation details.
		</p>
	</div>

	<!-- Location Section -->
	<div class="space-y-6 rounded-lg border border-gray-200 bg-gray-50 p-6">
		<div class="flex items-center gap-2">
			<MapPin class="h-5 w-5 text-primary" />
			<h3 class="text-lg font-semibold">Job Location</h3>
		</div>

		<!-- Country -->
		<div class="space-y-2">
			<Label class="text-base font-medium">
				Country <span class="text-destructive">*</span>
			</Label>
			<p class="text-sm text-muted-foreground">Where is this position based?</p>
			<Combobox
				items={availableCountries.map((c) => ({ value: c.code, label: c.name }))}
				value={country}
				onValueChange={(value) => {
					country = value || '';
					saveField('location');
				}}
				placeholder="Select country..."
				searchPlaceholder="Search countries..."
				emptyText="No countries found"
				class="w-full bg-white"
			/>
		</div>

		<!-- City -->
		<div class="space-y-2">
			<Label for="city" class="text-base font-medium">City</Label>
			<p class="text-sm text-muted-foreground">Which city is the job located in?</p>
			<Input
				id="city"
				type="text"
				bind:value={city}
				onblur={handleLocationBlur}
				placeholder="e.g., London, New York, Berlin"
				class="bg-white text-base"
			/>
		</div>

		<!-- State/Province/Region -->
		<div class="space-y-2">
			<Label for="region" class="text-base font-medium">State / Province / Region</Label>
			<p class="text-sm text-muted-foreground">
				Specify the state, province, or region (optional). Separate multiple with commas.
			</p>
			<Input
				id="region"
				type="text"
				bind:value={stateProvinceRegion}
				onblur={handleLocationBlur}
				placeholder="e.g., California, Greater London"
				class="bg-white text-base"
			/>
		</div>

		<!-- Address -->
		<div class="space-y-2">
			<Label for="address" class="text-base font-medium">Street Address</Label>
			<p class="text-sm text-muted-foreground">Full street address (optional but helpful)</p>
			<Input
				id="address"
				type="text"
				bind:value={address}
				onblur={handleLocationBlur}
				placeholder="e.g., 123 Main Street"
				class="bg-white text-base"
			/>
		</div>
	</div>

	<!-- Salary Section -->
	<div class="space-y-6 rounded-lg border border-gray-200 bg-gray-50 p-6">
		<div class="flex items-center gap-2">
			<DollarSign class="h-5 w-5 text-primary" />
			<h3 class="text-lg font-semibold">Compensation</h3>
		</div>

		<!-- Salary Range -->
		<div class="space-y-2">
			<Label class="text-base font-medium">Salary Range</Label>
			<p class="text-sm text-muted-foreground">
				Provide a salary range to attract suitable candidates. Transparency helps!
			</p>
			<div class="flex items-center gap-3">
				<Input
					type="number"
					bind:value={salaryStart}
					onblur={handleSalaryBlur}
					min="0"
					placeholder="From"
					class="flex-1 bg-white text-base"
				/>
				<span class="text-muted-foreground">to</span>
				<Input
					type="number"
					bind:value={salaryEnd}
					onblur={handleSalaryBlur}
					min="0"
					placeholder="To"
					class="flex-1 bg-white text-base"
				/>
			</div>
		</div>

		<!-- Currency -->
		<div class="space-y-2">
			<Label class="text-base font-medium">Currency</Label>
			<DropdownComponent
				options={availableCurrencies}
				value={salaryCurrency}
				showLabelInBrackets={true}
				onValueChange={(value) => {
					salaryCurrency = value;
					saveField('salary');
				}}
				placeholder="Select currency..."
				optionKey="code"
				labelKey="name"
				class="w-full bg-white"
			/>
		</div>

		<!-- Salary Period -->
		<div class="space-y-2">
			<Label class="text-base font-medium">Salary Period</Label>
			<p class="text-sm text-muted-foreground">How often is the salary paid?</p>
			<DropdownComponent
				options={availableSalaryPeriods}
				value={salaryType}
				onValueChange={(value) => {
					salaryType = value;
					saveField('salary');
				}}
				placeholder="Select period..."
				optionKey="code"
				labelKey="name"
				class="w-full bg-white"
			/>
		</div>

		<!-- Salary Extra Info -->
		<div class="space-y-2">
			<Label for="salaryExtra" class="text-base font-medium">Additional Compensation Details</Label>
			<p class="text-sm text-muted-foreground">
				Any extra information about compensation (bonuses, benefits, commission, etc.)
			</p>
			<textarea
				id="salaryExtra"
				bind:value={salaryExtra}
				onblur={handleSalaryBlur}
				placeholder="e.g., Performance bonuses, health insurance, 401k matching, commission structure..."
				class="min-h-[100px] w-full rounded-md border bg-white p-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
				rows="4"
			></textarea>
		</div>
	</div>

	<!-- Info box -->
	<div class="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
		<Info class="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
		<div class="text-sm text-blue-900">
			<p class="font-medium">Salary transparency increases applications</p>
			<p class="mt-1">
				Being upfront about compensation attracts more qualified candidates and saves time in the
				hiring process.
			</p>
		</div>
	</div>
</div>
