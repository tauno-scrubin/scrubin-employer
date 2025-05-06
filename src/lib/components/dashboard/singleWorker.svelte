<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { t } from '$lib/i18n';
	import type { Candidate } from '@/scrubinClient';
	import {
		BadgeCheck,
		Briefcase,
		Calendar1,
		Check,
		Clock,
		Eye,
		Globe,
		Heart,
		Languages,
		MapPin,
		User
	} from 'lucide-svelte';
	import Button from '../ui/button/button.svelte';

	let {
		worker,
		status,
		allowSelection,
		checked = $bindable(),
		onSelect,
		disabled = $bindable(),
		onView = () => {}
	}: {
		worker: Candidate;
		status?: string;
		allowSelection?: boolean;
		checked?: boolean;
		onSelect?: (worker: Candidate) => void;
		disabled?: boolean;
		onView?: (worker: Candidate) => void;
	} = $props();

	function toggleSelection() {
		if (!disabl) {
			onSelect?.(worker);
		}
	}

	let disabl = $derived(allowSelection && disabled && !checked);
</script>

<Card.Root
	class="overflow-hidden  {disabl
		? 'cursor-not-allowed opacity-50'
		: 'cursor-default'} flex h-full flex-col justify-start border border-gray-200 transition-all duration-300 hover:shadow-md"
>
	<!-- Card Header -->
	<Card.Header class="relative border-b bg-white p-4 pb-3">
		<div class="flex items-center gap-3">
			<div
				class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-500"
			>
				<User class="h-5 w-5" />
			</div>
			<div>
				{#if worker.professions && worker.professions.length > 0}
					<h3 class="text-base font-semibold text-gray-800">{worker.professions.join(', ')}</h3>
				{/if}
				{#if worker.speciality && worker.speciality.length > 0}
					<p class="text-xs text-gray-500">{worker.speciality.join(', ')}</p>
				{/if}
			</div>

			{#if allowSelection}
				<div class="absolute right-2 top-2 flex items-center gap-2">
					<Button
						variant="ghost"
						size="icon"
						class="rounded-full p-1 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
						onclick={() => onView(worker)}
					>
						<Eye class="h-4 w-4 " />
					</Button>
					<Button
						onclick={toggleSelection}
						disabled={disabled && !checked}
						variant="ghost"
						size="icon"
						class="rounded-full p-1 disabled:cursor-not-allowed"
					>
						<Heart
							fill={checked ? 'currentColor' : 'none'}
							class="h-4 w-4  {checked ? 'text-red-500' : 'text-gray-400'} "
						/>
					</Button>
				</div>
			{/if}
		</div>
	</Card.Header>

	<!-- Card Body -->
	<Card.Content
		onclick={toggleSelection}
		class="flex flex-col space-y-3 bg-white p-4 text-sm text-gray-600 {allowSelection
			? 'cursor-pointer'
			: 'cursor-default'}"
	>
		<div class="flex items-center">
			<Globe class="mr-2 h-4 w-4 flex-shrink-0 text-gray-400" />
			<span class="text-xs"
				>{$t('dashboard.worker.registrationCountry')}:
				<span class="font-medium text-gray-700"
					>{worker.professionRegistrationCountry || $t('dashboard.worker.notSpecified')}</span
				></span
			>
		</div>

		{#if worker.languages && worker.languages.length > 0}
			<div class="flex items-center">
				<Languages class="mr-2 h-4 w-4 flex-shrink-0 text-gray-400" />
				<span class="flex items-center gap-1 text-xs"
					>{$t('dashboard.worker.languages')}:
					<div class="flex flex-wrap gap-1">
						{#each worker.languages as language}
							<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{language}</span>
						{:else}
							<span class="font-medium text-gray-700">{$t('dashboard.worker.notSpecified')}</span>
						{/each}
					</div>
				</span>
			</div>
		{/if}

		{#if worker.verifications && worker.verifications.length > 0}
			<div class="flex items-center">
				<BadgeCheck class="mr-2 h-4 w-4 flex-shrink-0 text-gray-400" />
				<span class="text-xs"
					>{$t('dashboard.worker.verifications')}:
					<span class="font-medium text-gray-700">{worker.verifications.join(', ')}</span></span
				>
			</div>
		{/if}

		<div class="flex items-center">
			<Briefcase class="mr-2 h-4 w-4 flex-shrink-0 text-gray-400" />
			<span class="text-xs"
				>{$t('dashboard.worker.totalWorkExperience')}:
				{#if worker.totalWorkExperience}
					<span class="font-medium text-gray-700"
						>{worker.totalWorkExperience} {$t('dashboard.worker.years')}</span
					>
				{:else}
					<span class="font-medium text-gray-700">{$t('dashboard.worker.notSpecified')}</span>
				{/if}
			</span>
		</div>

		{#if worker.preferredSpeciality && worker.preferredSpeciality.length > 0}
			<div class="flex items-start">
				<Briefcase class="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
				<span class="text-xs"
					>{$t('dashboard.worker.preferredSpeciality')}:
					<span class="font-medium text-gray-700">{worker.preferredSpeciality.join(', ')}</span
					></span
				>
			</div>
		{/if}

		{#if worker.preferredLocations && worker.preferredLocations.length > 0}
			<div class="flex items-center">
				<MapPin class="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
				<span class="text-xs"
					>{$t('dashboard.worker.preferredLocations')}:
					<span class="font-medium text-gray-700">{worker.preferredLocations.join(', ')}</span
					></span
				>
			</div>
		{/if}

		{#if worker.countriesLookingForJob && worker.countriesLookingForJob.length > 0}
			<div class="flex items-start">
				<Globe class="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
				<span class="text-xs"
					>{$t('dashboard.worker.lookingForWorkIn')}:
					<span class="font-medium text-gray-700">{worker.countriesLookingForJob.join(', ')}</span
					></span
				>
			</div>
		{/if}

		{#if worker.interestedOffers && worker.interestedOffers.length > 0}
			<div class="flex items-start">
				<Calendar1 class="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
				<span class="text-xs"
					>{$t('dashboard.worker.availability')}:
					<span class="font-medium text-gray-700">{worker.interestedOffers.join(', ')}</span></span
				>
			</div>
		{/if}
	</Card.Content>

	<Card.Footer class="flex w-full flex-col gap-2 bg-white p-4 pt-0">
		{#if worker.top3Terms && worker.top3Terms.length > 0}
			<div class="flex w-full flex-wrap items-center gap-1.5">
				{#each worker.top3Terms as term}
					<span class="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-800">{term}</span>
				{/each}
			</div>
		{/if}

		<div class="flex w-full flex-wrap items-center gap-2">
			{#if worker.verified}
				<div class="flex items-center rounded-full bg-green-50 px-2 py-1 text-xs text-green-700">
					<BadgeCheck class="mr-1 h-3 w-3" />
					<span>{$t('dashboard.worker.verified')}</span>
				</div>
			{/if}
			{#if worker.recentlyActive}
				<div class="flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-800">
					<Clock class="mr-1 h-3 w-3" />
					<span>{$t('dashboard.worker.recentlyActive')}</span>
				</div>
			{/if}
			{#if status}
				<div class="flex items-center rounded-full bg-green-50 px-2 py-1 text-xs text-green-700">
					<Check class="mr-1 h-3 w-3" />
					<span>{status}</span>
				</div>
			{/if}
		</div>
	</Card.Footer>
</Card.Root>
