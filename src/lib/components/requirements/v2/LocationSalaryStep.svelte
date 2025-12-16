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
	import { locale, t } from '$lib/i18n';
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
	let country = $state(requirement.countryIso || '');
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
			toast.success($t('requirementsV2.success.saved'));
		} catch (error) {
			console.error('Failed to save:', error);
			toast.error($t('requirementsV2.errors.failedToSave'));
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

<div class="w-full space-y-6">
	<!-- Info box -->
	<div class="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
		<Info class="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
		<div class="text-sm text-blue-900">
			<p class="font-medium">{$t('requirementsV2.tips.salaryTransparency.title')}</p>
			<p class="mt-1">
				{$t('requirementsV2.tips.salaryTransparency.description')}
			</p>
		</div>
	</div>

	<div>
		<h2 class="mb-2 text-2xl font-semibold">{$t('requirementsV2.steps.location.heading')}</h2>
		<p class="text-sm text-muted-foreground">
			{$t('requirementsV2.steps.location.subheading')}
		</p>
	</div>

	<!-- Location Section -->
	<div class="space-y-4">
		<div class="flex items-center gap-2">
			<h3 class="text-lg font-semibold">{$t('requirementsV2.sections.location')}</h3>
		</div>

		<!-- Country and City -->
		<div class="grid grid-cols-2 gap-4">
			<div class="space-y-2">
				<Label class="text-base font-medium">
					{$t('requirementsV2.fields.country.label')} <span class="text-destructive">*</span>
				</Label>
				<Combobox
					items={availableCountries.map((c) => ({ value: c.code, label: c.name }))}
					value={country}
					onValueChange={(value) => {
						country = value || '';
						saveField('location');
					}}
					placeholder={$t('requirementsV2.fields.country.placeholder')}
					searchPlaceholder={$t('requirementsV2.fields.country.searchPlaceholder')}
					emptyText={$t('requirementsV2.fields.country.emptyText')}
					class="w-full bg-white"
				/>
			</div>

			<div class="space-y-2">
				<Label for="city" class="text-base font-medium"
					>{$t('requirementsV2.fields.city.label')}</Label
				>
				<Input
					id="city"
					type="text"
					bind:value={city}
					onblur={handleLocationBlur}
					placeholder={$t('requirementsV2.fields.city.placeholder')}
					class="bg-white text-base"
				/>
			</div>
		</div>

		<!-- State/Province/Region and Address -->
		<div class="grid grid-cols-2 gap-4">
			<div class="space-y-2">
				<Label for="region" class="text-base font-medium"
					>{$t('requirementsV2.fields.region.label')}</Label
				>
				<Input
					id="region"
					type="text"
					bind:value={stateProvinceRegion}
					onblur={handleLocationBlur}
					placeholder={$t('requirementsV2.fields.region.placeholder')}
					class="bg-white text-base"
				/>
			</div>

			<div class="space-y-2">
				<Label for="address" class="text-base font-medium"
					>{$t('requirementsV2.fields.address.label')}</Label
				>
				<Input
					id="address"
					type="text"
					bind:value={address}
					onblur={handleLocationBlur}
					placeholder={$t('requirementsV2.fields.address.placeholder')}
					class="bg-white text-base"
				/>
			</div>
		</div>
	</div>

	<!-- Salary Section -->
	<div class="w-full space-y-4">
		<div class="flex items-center gap-2">
			<h3 class="text-lg font-semibold">{$t('requirementsV2.sections.compensation')}</h3>
		</div>

		<!-- Salary Range and Currency -->
		<div class="space-y-2">
			<Label class="text-base font-medium">{$t('requirementsV2.fields.salaryRange.label')}</Label>
			<div class="flex items-center gap-3">
				<Input
					type="number"
					bind:value={salaryStart}
					onblur={handleSalaryBlur}
					min="0"
					placeholder={$t('requirementsV2.fields.salaryRange.from')}
					class="flex-1 bg-white text-base"
				/>
				<span class="text-muted-foreground"
					>{$t('requirementsV2.fields.salaryRange.to').toLowerCase()}</span
				>
				<Input
					type="number"
					bind:value={salaryEnd}
					onblur={handleSalaryBlur}
					min="0"
					placeholder={$t('requirementsV2.fields.salaryRange.to')}
					class="flex-1 bg-white text-base"
				/>
				<DropdownComponent
					options={availableCurrencies}
					value={salaryCurrency}
					showLabelInBrackets={true}
					onValueChange={(value) => {
						salaryCurrency = value;
						saveField('salary');
					}}
					placeholder={$t('requirementsV2.fields.currency.placeholder')}
					optionKey="code"
					labelKey="name"
					class="w-32 bg-white"
				/>
			</div>
		</div>

		<!-- Salary Period -->
		<div class="space-y-2">
			<Label class="text-base font-medium">{$t('requirementsV2.fields.salaryPeriod.label')}</Label>
			<DropdownComponent
				options={availableSalaryPeriods}
				value={salaryType}
				onValueChange={(value) => {
					salaryType = value;
					saveField('salary');
				}}
				placeholder={$t('requirementsV2.fields.salaryPeriod.placeholder')}
				optionKey="code"
				labelKey="name"
				class="w-full bg-white"
			/>
		</div>

		<!-- Salary Extra Info -->
		<div class="space-y-2">
			<Label for="salaryExtra" class="text-base font-medium"
				>{$t('requirementsV2.fields.salaryExtra.label')}</Label
			>
			<textarea
				id="salaryExtra"
				bind:value={salaryExtra}
				onblur={handleSalaryBlur}
				placeholder={$t('requirementsV2.fields.salaryExtra.placeholder')}
				class="min-h-[100px] w-full rounded-md border bg-white p-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
				rows="4"
			></textarea>
		</div>
	</div>
</div>
