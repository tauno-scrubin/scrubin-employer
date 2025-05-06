<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { t } from '$lib/i18n';
	import type { HuntableDetails } from '@/scrubinClient';
	import { scrubinClient } from '@/scrubinClient/client';
	import { Award, Briefcase, GraduationCap, Heart, Sparkle } from 'lucide-svelte';
	import Button from '../ui/button/button.svelte';

	let {
		open = $bindable(false),
		lookupId = $bindable(0),
		huntableId = $bindable(''),
		allowSelection = $bindable(false),
		onSelect = $bindable(() => {}),
		huntableSelected = $bindable()
	}: {
		open: boolean;
		lookupId: number;
		huntableId: string;
		allowSelection: boolean;
		onSelect: (huntableId: string) => void;
		huntableSelected: boolean;
	} = $props();

	let worker: HuntableDetails | null = $state(null);
	let isLoading = $state(false);
	let hasError = $state(false);

	$effect(() => {
		if (open && lookupId && huntableId) {
			getWorker();
		}
	});

	async function getWorker() {
		isLoading = true;
		hasError = false;
		try {
			const response = await scrubinClient.hunt.getHuntableDetails(
				lookupId.toString(),
				huntableId.toString()
			);
			worker = response;
		} catch (error) {
			console.error('Error fetching worker data:', error);
			hasError = true;
		} finally {
			isLoading = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[90vh] max-w-3xl overflow-y-auto ">
		{#if isLoading}
			<div class="flex items-center justify-center p-8">
				<div
					class="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
				></div>
			</div>
		{:else if hasError}
			<div class="p-4 text-center text-red-500">
				{$t('dashboard.workerDialog.loadingError')}
			</div>
		{:else if worker}
			<div class="  rounded-md bg-white">
				<Sparkle fill="currentColor" strokeWidth={1} class="mb-4 h-8 w-8 rotate-45 text-blue-500" />
				<h2 class="mb-4 flex flex-row justify-between gap-2 text-xl font-medium">
					{$t('dashboard.workerDialog.workerInformation')}

					{#if allowSelection}
						<Button
							onclick={() => onSelect(huntableId)}
							variant="ghost"
							size="icon"
							class="rounded-full p-1 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
						>
							<Heart
								fill={huntableSelected ? 'currentColor' : 'none'}
								class="h-4 w-4 {huntableSelected ? 'text-red-500' : 'text-gray-400'}"
							/>
						</Button>
					{/if}
				</h2>

				<div class="space-y-3">
					<div class="grid grid-cols-1 gap-4 border-b pb-3 text-sm">
						<div class="grid w-full grid-cols-[150px_1fr] items-start">
							<h4 class="font-semibold">{$t('dashboard.workerDialog.professions')}</h4>
							<div class="flex flex-row flex-wrap gap-2">
								{#if worker.professions && worker.professions.length > 0}
									{#each worker.professions as profession}
										<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
											>{profession}</span
										>
									{/each}
								{:else}
									<p class="text-gray-500">{$t('dashboard.worker.notSpecified')}</p>
								{/if}
							</div>
						</div>

						<div class="grid w-full grid-cols-[150px_1fr] items-start">
							<h4 class="font-semibold">{$t('dashboard.workerDialog.registrationCountry')}</h4>
							<p class={worker.professionRegistrationCountry ? 'text-gray-900' : 'text-gray-500'}>
								{worker.professionRegistrationCountry || $t('dashboard.worker.notSpecified')}
							</p>
						</div>
					</div>

					<div class="grid grid-cols-1 gap-4 text-sm">
						<div class="grid w-full grid-cols-[150px_1fr] items-start">
							<h4 class="font-semibold">{$t('dashboard.workerDialog.speciality')}</h4>
							<div class="flex flex-row flex-wrap gap-2">
								{#if worker.speciality && worker.speciality.length > 0}
									{#each worker.speciality as spec}
										<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{spec}</span
										>
									{/each}
								{:else}
									<p class="text-gray-500">{$t('dashboard.worker.notSpecified')}</p>
								{/if}
							</div>
						</div>

						<div class="grid w-full grid-cols-[150px_1fr] items-start">
							<h4 class="font-semibold">{$t('dashboard.workerDialog.activityStatus')}</h4>
							<p class="text-gray-900">
								{worker.recentlyActive
									? $t('dashboard.workerDialog.recentlyActive')
									: $t('dashboard.workerDialog.notRecentlyActive')}
							</p>
						</div>

						<div class="grid w-full grid-cols-[150px_1fr] items-start">
							<h4 class="font-semibold">{$t('dashboard.workerDialog.verified')}</h4>
							<p class="text-gray-900">
								{worker.verified
									? $t('dashboard.workerDialog.verified')
									: $t('dashboard.workerDialog.notVerified')}
							</p>
						</div>

						<div class="grid w-full grid-cols-[150px_1fr] items-start">
							<h4 class="font-semibold">{$t('dashboard.workerDialog.verifications')}</h4>
							<div class="flex flex-row flex-wrap gap-2">
								{#if worker.verifications && worker.verifications.length > 0}
									{#each worker.verifications as verification}
										<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
											>{verification}</span
										>
									{/each}
								{:else}
									<p class="text-gray-500">{$t('dashboard.worker.notSpecified')}</p>
								{/if}
							</div>
						</div>

						<div class="grid w-full grid-cols-[150px_1fr] items-start">
							<h4 class="font-semibold">{$t('dashboard.workerDialog.workExperience')}</h4>
							<p class="text-gray-900">
								{worker.totalWorkExperience || 0}
								{$t('dashboard.worker.years')}
							</p>
						</div>

						<div class="grid w-full grid-cols-[150px_1fr] items-start">
							<h4 class="font-semibold">{$t('dashboard.workerDialog.languages')}</h4>
							<div class="flex flex-row flex-wrap gap-2">
								{#if worker.languages && worker.languages.length > 0}
									{#each worker.languages as language}
										<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
											>{language}</span
										>
									{/each}
								{:else}
									<p class="text-gray-500">{$t('dashboard.worker.notSpecified')}</p>
								{/if}
							</div>
						</div>
					</div>

					<!-- Work Experience Section -->
					<div class="mt-4 border-t pt-3">
						<h4 class="mb-4 text-xl font-medium">{$t('dashboard.workerDialog.experience')}</h4>

						{#if worker.workExperiences && worker.workExperiences.length > 0}
							<div class="mb-4">
								<h5 class="mb-2 flex items-center font-semibold">
									<Briefcase class="mr-1 h-4 w-4" />
									{$t('dashboard.workerDialog.workExperienceTitle')}
								</h5>
								<div class="space-y-3">
									{#each worker.workExperiences as experience}
										<div class="border-l-2 border-blue-200 py-1 pl-3">
											<div class="font-medium">{experience.company}</div>
											<div class="text-sm text-gray-600">
												{new Date(experience.start).toLocaleDateString('en-US', {
													year: 'numeric',
													month: 'short'
												})} -
												{experience.end
													? new Date(experience.end).toLocaleDateString('en-US', {
															year: 'numeric',
															month: 'short'
														})
													: $t('dashboard.workerDialog.present')}
											</div>
											<div class="mt-1 text-sm">{experience.desc}</div>
										</div>
									{:else}
										<p class="text-gray-500">{$t('dashboard.workerDialog.noWorkExperience')}</p>
									{/each}
								</div>
							</div>
						{/if}

						{#if worker.educations && worker.educations.length > 0}
							<div class="mb-4">
								<h5 class="mb-2 flex items-center font-semibold">
									<GraduationCap class="mr-1 h-4 w-4" />
									{$t('dashboard.workerDialog.education')}
								</h5>
								<div class="space-y-3">
									{#each worker.educations as education}
										<div class="border-l-2 border-blue-200 py-1 pl-3">
											<div class="font-medium">{education.school}</div>
											<div class="text-sm text-gray-600">
												{education.speciality}
											</div>
											<div class="text-sm text-gray-600">
												{education.startYear} - {education.endYear ||
													$t('dashboard.workerDialog.present')}
											</div>
										</div>
									{:else}
										<p class="text-gray-500">{$t('dashboard.workerDialog.noEducation')}</p>
									{/each}
								</div>
							</div>
						{/if}

						{#if worker.trainings && worker.trainings.length > 0}
							<div class="mb-4">
								<h5 class="mb-2 flex items-center font-semibold">
									<Award class="mr-1 h-4 w-4" />
									{$t('dashboard.workerDialog.trainings')}
								</h5>
								<div class="space-y-3">
									{#each worker.trainings as training}
										<div class="border-l-2 border-blue-200 py-1 pl-3">
											<div class="font-medium">{training.name}</div>
											<div class="text-sm text-gray-600">
												{new Date(training.date).toLocaleDateString('en-US', {
													year: 'numeric',
													month: 'short'
												})}
											</div>
											<div class="mt-1 text-sm">{training.description}</div>
										</div>
									{:else}
										<p class="text-gray-500">{$t('dashboard.workerDialog.noTrainings')}</p>
									{/each}
								</div>
							</div>
						{/if}
					</div>

					<div class="mt-4 border-t pt-3">
						<h4 class="mb-4 text-xl font-medium">{$t('dashboard.workerDialog.jobPreferences')}</h4>

						<div class="grid grid-cols-1 gap-4 text-sm">
							<div class="grid w-full grid-cols-[150px_1fr] items-start">
								<h4 class="font-semibold">{$t('dashboard.workerDialog.countries')}</h4>
								<div class="flex flex-row flex-wrap gap-2">
									{#if worker.countriesLookingForJob && worker.countriesLookingForJob.length > 0}
										{#each worker.countriesLookingForJob as country}
											<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
												>{country}</span
											>
										{/each}
									{:else}
										<p class="text-gray-500">{$t('dashboard.worker.notSpecified')}</p>
									{/if}
								</div>
							</div>

							<div class="grid w-full grid-cols-[150px_1fr] items-start">
								<h4 class="font-semibold">{$t('dashboard.workerDialog.preferredLocations')}</h4>
								<div class="flex flex-row flex-wrap gap-2">
									{#if worker.preferredLocations && worker.preferredLocations.length > 0}
										{#each worker.preferredLocations as location}
											<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
												>{location}</span
											>
										{/each}
									{:else}
										<p class="text-gray-500">{$t('dashboard.worker.notSpecified')}</p>
									{/if}
								</div>
							</div>

							<div class="grid w-full grid-cols-[150px_1fr] items-start">
								<h4 class="font-semibold">{$t('dashboard.workerDialog.preferredSpeciality')}</h4>
								<div class="flex flex-row flex-wrap gap-2">
									{#if worker.preferredSpeciality && worker.preferredSpeciality.length > 0}
										{#each worker.preferredSpeciality as speciality}
											<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
												>{speciality}</span
											>
										{/each}
									{:else}
										<p class="text-gray-500">{$t('dashboard.worker.notSpecified')}</p>
									{/if}
								</div>
							</div>

							<div class="grid w-full grid-cols-[150px_1fr] items-start">
								<h4 class="font-semibold">{$t('dashboard.workerDialog.facilityTypes')}</h4>
								<div class="flex flex-row flex-wrap gap-2">
									{#if worker.preferredFacilityTypes && worker.preferredFacilityTypes.length > 0}
										{#each worker.preferredFacilityTypes as facilityType}
											<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
												>{facilityType}</span
											>
										{/each}
									{:else}
										<p class="text-gray-500">{$t('dashboard.worker.notSpecified')}</p>
									{/if}
								</div>
							</div>
						</div>
					</div>

					<div class="border-t pt-3">
						<h4 class="mb-4 text-xl font-medium">
							{$t('dashboard.workerDialog.additionalInformation')}
						</h4>

						<div class="grid grid-cols-1 gap-4 text-sm">
							<div class="grid w-full grid-cols-[150px_1fr] items-start">
								<h4 class="font-semibold">{$t('dashboard.workerDialog.softSkills')}</h4>
								<div class="flex flex-row flex-wrap gap-2">
									{#if worker.softSkills && worker.softSkills.length > 0}
										{#each worker.softSkills as skill}
											<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
												>{skill}</span
											>
										{/each}
									{:else}
										<p class="text-gray-500">{$t('dashboard.worker.notSpecified')}</p>
									{/if}
								</div>
							</div>

							<div class="grid w-full grid-cols-[150px_1fr] items-start">
								<h4 class="font-semibold">{$t('dashboard.workerDialog.otherSkills')}</h4>
								<div class="flex flex-row flex-wrap gap-2">
									{#if worker.otherSkills && worker.otherSkills.length > 0}
										{#each worker.otherSkills as skill}
											<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
												>{skill}</span
											>
										{/each}
									{:else}
										<p class="text-gray-500">{$t('dashboard.worker.notSpecified')}</p>
									{/if}
								</div>
							</div>

							<div class="grid w-full grid-cols-[150px_1fr] items-start">
								<h4 class="font-semibold">{$t('dashboard.workerDialog.interestedOffers')}</h4>
								<div class="flex flex-row flex-wrap gap-2">
									{#if worker.interestedOffers && worker.interestedOffers.length > 0}
										{#each worker.interestedOffers as offer}
											<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
												>{offer}</span
											>
										{/each}
									{:else}
										<p class="text-gray-500">{$t('dashboard.worker.notSpecified')}</p>
									{/if}
								</div>
							</div>

							<div class="grid w-full grid-cols-[150px_1fr] items-start">
								<h4 class="font-semibold">{$t('dashboard.workerDialog.top3Terms')}</h4>
								<div class="flex flex-row flex-wrap gap-2">
									{#if worker.top3Terms && worker.top3Terms.length > 0}
										{#each worker.top3Terms as term}
											<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
												>{term}</span
											>
										{/each}
									{:else}
										<p class="text-gray-500">{$t('dashboard.worker.notSpecified')}</p>
									{/if}
								</div>
							</div>

							<div class="grid w-full grid-cols-[150px_1fr] items-start">
								<h4 class="font-semibold">{$t('dashboard.workerDialog.about')}</h4>
								<p class={worker.userDesc ? 'text-gray-900' : 'text-gray-500'}>
									{worker.userDesc || $t('dashboard.worker.notSpecified')}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		{:else}
			<div class="p-4 text-center text-gray-500">
				{$t('dashboard.workerDialog.noWorkerData')}
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
