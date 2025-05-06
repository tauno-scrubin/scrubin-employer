<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { t } from '$lib/i18n';
	import type { InterestedCandidateDetails } from '@/scrubinClient';
	import { scrubinClient } from '@/scrubinClient/client';
	import {
		Award,
		Briefcase,
		Calendar,
		GraduationCap,
		Mail,
		Phone,
		Sparkle
	} from 'lucide-svelte';
	import CandidateChat from './candidateChat.svelte';
	import CandidateNotes from './candidateNotes.svelte';

	let {
		open = $bindable(false),
		huntId = $bindable(0),
		candidateId = $bindable(0)
	}: {
		open: boolean;
		huntId: number;
		candidateId: number;
	} = $props();

	let worker: InterestedCandidateDetails | null = $state(null);
	let isLoading = $state(false);
	let hasError = $state(false);
	let activeTab = $state('profile'); // profile, messages, notes

	$effect(() => {
		if (open && huntId && candidateId) {
			getWorker();
		}
	});

	async function getWorker() {
		isLoading = true;
		hasError = false;
		try {
			// Assuming there's an API endpoint for interested candidates
			const response = await scrubinClient.hunt.getInterestedCandidateDetails(huntId, candidateId);
			worker = response;
		} catch (error) {
			console.error('Error fetching interested worker data:', error);
			hasError = true;
		} finally {
			isLoading = false;
		}
	}

	function formatDate(dateString: string): string {
		try {
			return new Date(dateString).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			});
		} catch (e) {
			return dateString || 'Not available';
		}
	}

	function formatDateTime(dateString: string): string {
		try {
			const date = new Date(dateString);
			const datePart = date.toLocaleDateString('en-US', {
				day: 'numeric',
				month: 'long',
				year: 'numeric'
			});
			const timePart = date.toLocaleTimeString('en-US', {
				hour: 'numeric',
				minute: '2-digit',
				hour12: true
			});
			return `${datePart} at ${timePart}`;
		} catch (e) {
			return dateString || 'Not available';
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[90vh] max-w-3xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title class="flex items-center justify-between gap-2">
				{$t('dashboard.interestedWorkerDialog.title')}
			</Dialog.Title>
			<Dialog.Description>
				{$t('dashboard.interestedWorkerDialog.description')}
			</Dialog.Description>
		</Dialog.Header>

		{#if isLoading}
			<div class="flex items-center justify-center p-8">
				<div
					class="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
				></div>
			</div>
		{:else if hasError}
			<div class="p-4 text-center text-red-500">
				{$t('dashboard.interestedWorkerDialog.loading')}
			</div>
		{:else if worker}
			<Tabs.Root value="profile" class="w-full">
				<Tabs.List class="grid w-full grid-cols-3">
					<Tabs.Trigger value="profile"
						>{$t('dashboard.interestedWorkerDialog.tabs.profile')}</Tabs.Trigger
					>
					<Tabs.Trigger value="messages"
						>{$t('dashboard.interestedWorkerDialog.tabs.messages')}</Tabs.Trigger
					>
					<Tabs.Trigger value="notes"
						>{$t('dashboard.interestedWorkerDialog.tabs.notes')}</Tabs.Trigger
					>
				</Tabs.List>

				<Tabs.Content value="profile">
					<Card.Root>
						<Card.Content class="pt-6">
							{#if worker.dateInterview}
								<div
									class="col-span-full mb-2 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-2 text-sm"
								>
									<Calendar class="h-4 w-4 text-green-600" />
									<span class="font-medium text-green-800">
										{$t('dashboard.interestedWorkerDialog.interview')}
										{formatDateTime(worker.dateInterview)}
									</span>
								</div>
							{/if}

							<div class="mb-6 rounded-md bg-blue-50 p-4 shadow-sm">
								<h2 class="mb-4 flex items-center text-xl font-medium">
									<Sparkle fill="currentColor" strokeWidth={1} class="mr-2 h-5 w-5 text-blue-500" />
									{$t('dashboard.interestedWorkerDialog.contactInfo')}
								</h2>

								<div class="grid grid-cols-1 gap-4">
									<div class="mb-2 flex items-center gap-3">
										<div
											class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-lg font-semibold text-blue-600"
										>
											{worker.firstName?.[0]}{worker.lastName?.[0]}
										</div>
										<span class="text-lg font-semibold text-gray-900"
											>{worker.firstName} {worker.lastName}</span
										>
									</div>

									<div class="grid grid-cols-1 gap-2 pl-1 md:grid-cols-2">
										<div
											class="group flex items-center gap-3 rounded-md transition-colors hover:bg-blue-50"
										>
											<div class="rounded-full bg-blue-50 p-2">
												<Mail class="h-4 w-4 text-blue-600" />
											</div>
											<div class="flex flex-col">
												<span class="text-xs text-gray-500"
													>{$t('dashboard.interestedWorkerDialog.email')}</span
												>
												<a
													href={`mailto:${worker.email}`}
													class="text-sm text-gray-700 transition-colors group-hover:text-blue-700"
												>
													{worker.email}
												</a>
											</div>
										</div>

										<div
											class="group flex items-center gap-3 rounded-md transition-colors hover:bg-blue-50"
										>
											<div class="rounded-full bg-blue-50 p-2">
												<Phone class="h-4 w-4 text-blue-600" />
											</div>
											<div class="flex flex-col">
												<span class="text-xs text-gray-500"
													>{$t('dashboard.interestedWorkerDialog.phone')}</span
												>
												<a
													href={`tel:${worker.phone}`}
													class="text-sm text-gray-700 transition-colors group-hover:text-blue-700"
												>
													{worker.phone}
												</a>
											</div>
										</div>

										<div class="group flex items-center gap-3 rounded-md md:col-span-2">
											<div class="rounded-full bg-blue-50 p-2">
												<Calendar class="h-4 w-4 text-blue-600" />
											</div>
											<div class="flex flex-col">
												<span class="text-xs text-gray-500"
													>{$t('dashboard.interestedWorkerDialog.interestedSince')}</span
												>
												<span class="text-sm text-gray-700"
													>{formatDate(worker.dateInterested)}</span
												>
											</div>
										</div>
									</div>

									{#if worker.professionNumbers && worker.professionNumbers.length > 0}
										<div class="mt-3 border-t pt-3">
											<h4 class="mb-2 text-sm font-medium text-gray-700">
												{$t('dashboard.interestedWorkerDialog.professionalRegistration')}:
											</h4>
											<div class="grid grid-cols-1 gap-2 md:grid-cols-2">
												{#each worker.professionNumbers as registration}
													<div class="flex items-center gap-2 rounded-md">
														<span class="text-xs font-medium text-gray-500"
															>{registration.countryRegistered}:</span
														>
														<span class="text-sm text-gray-700">{registration.number}</span>
													</div>
												{/each}
											</div>
										</div>
									{/if}
								</div>
							</div>

							<div class="space-y-3">
								<div class="grid grid-cols-1 gap-4 border-b pb-3 text-sm">
									<div class="grid w-full grid-cols-[150px_1fr] items-start">
										<h4 class="font-semibold">
											{$t('dashboard.interestedWorkerDialog.professions')}
										</h4>
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
										<h4 class="font-semibold">
											{$t('dashboard.interestedWorkerDialog.registrationCountry')}
										</h4>
										<p
											class={worker.professionRegistrationCountry
												? 'text-gray-900'
												: 'text-gray-500'}
										>
											{worker.professionRegistrationCountry || $t('dashboard.worker.notSpecified')}
										</p>
									</div>
								</div>

								<div class="grid grid-cols-1 gap-4 text-sm">
									<div class="grid w-full grid-cols-[150px_1fr] items-start">
										<h4 class="font-semibold">
											{$t('dashboard.interestedWorkerDialog.speciality')}
										</h4>
										<div class="flex flex-row flex-wrap gap-2">
											{#if worker.speciality && worker.speciality.length > 0}
												{#each worker.speciality as spec}
													<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
														>{spec}</span
													>
												{/each}
											{:else}
												<p class="text-gray-500">{$t('dashboard.worker.notSpecified')}</p>
											{/if}
										</div>
									</div>

									<div class="grid w-full grid-cols-[150px_1fr] items-start">
										<h4 class="font-semibold">
											{$t('dashboard.interestedWorkerDialog.activityStatus')}
										</h4>
										<p class="text-gray-900">
											{worker.recentlyActive
												? $t('dashboard.workerDialog.recentlyActive')
												: $t('dashboard.workerDialog.notRecentlyActive')}
										</p>
									</div>

									<div class="grid w-full grid-cols-[150px_1fr] items-start">
										<h4 class="font-semibold">{$t('dashboard.interestedWorkerDialog.verified')}</h4>
										<p class="text-gray-900">
											{worker.verified
												? $t('dashboard.workerDialog.verified')
												: $t('dashboard.workerDialog.notVerified')}
										</p>
									</div>

									<div class="grid w-full grid-cols-[150px_1fr] items-start">
										<h4 class="font-semibold">
											{$t('dashboard.interestedWorkerDialog.verifications')}
										</h4>
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
										<h4 class="font-semibold">
											{$t('dashboard.interestedWorkerDialog.workExperience')}
										</h4>
										<p class="text-gray-900">{worker.totalWorkExperience || 0} years</p>
									</div>

									<div class="grid w-full grid-cols-[150px_1fr] items-start">
										<h4 class="font-semibold">
											{$t('dashboard.interestedWorkerDialog.languages')}
										</h4>
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

								<div class="mt-4 border-t pt-3">
									<h4 class="mb-4 text-xl font-medium">
										{$t('dashboard.interestedWorkerDialog.experience')}
									</h4>

									{#if worker.workExperiences && worker.workExperiences.length > 0}
										<div class="mb-4">
											<h5 class="mb-2 flex items-center font-semibold">
												<Briefcase class="mr-1 h-4 w-4" />
												{$t('dashboard.interestedWorkerDialog.workExperience')}
											</h5>
											<div class="space-y-3">
												{#each worker.workExperiences as experience}
													<div class="border-l-2 border-blue-200 py-1 pl-3">
														<div class="font-medium">{experience.company}</div>
														<div class="text-sm text-gray-600">
															{formatDate(experience.start)} - {experience.end
																? formatDate(experience.end)
																: $t('dashboard.interestedWorkerDialog.present')}
														</div>
														<div class="mt-1 text-sm">{experience.desc}</div>
													</div>
												{/each}
											</div>
										</div>
									{/if}

									{#if worker.educations && worker.educations.length > 0}
										<div class="mb-4">
											<h5 class="mb-2 flex items-center font-semibold">
												<GraduationCap class="mr-1 h-4 w-4" />
												{$t('dashboard.interestedWorkerDialog.education')}
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
																$t('dashboard.interestedWorkerDialog.present')}
														</div>
													</div>
												{/each}
											</div>
										</div>
									{/if}

									{#if worker.trainings && worker.trainings.length > 0}
										<div class="mb-4">
											<h5 class="mb-2 flex items-center font-semibold">
												<Award class="mr-1 h-4 w-4" />
												{$t('dashboard.interestedWorkerDialog.trainings')}
											</h5>
											<div class="space-y-3">
												{#each worker.trainings as training}
													<div class="border-l-2 border-blue-200 py-1 pl-3">
														<div class="font-medium">{training.name}</div>
														<div class="text-sm text-gray-600">
															{formatDate(training.date)}
														</div>
														<div class="mt-1 text-sm">{training.description}</div>
													</div>
												{/each}
											</div>
										</div>
									{/if}
								</div>

								<div class="mt-4 border-t pt-3">
									<h4 class="mb-4 text-xl font-medium">
										{$t('dashboard.interestedWorkerDialog.jobPreferences')}
									</h4>

									<div class="grid grid-cols-1 gap-4 text-sm">
										<div class="grid w-full grid-cols-[150px_1fr] items-start">
											<h4 class="font-semibold">
												{$t('dashboard.interestedWorkerDialog.countries')}
											</h4>
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
											<h4 class="font-semibold">
												{$t('dashboard.interestedWorkerDialog.preferredLocations')}
											</h4>
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
											<h4 class="font-semibold">
												{$t('dashboard.interestedWorkerDialog.preferredSpeciality')}
											</h4>
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
											<h4 class="font-semibold">
												{$t('dashboard.interestedWorkerDialog.facilityTypes')}
											</h4>
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

										<div class="grid w-full grid-cols-[150px_1fr] items-start">
											<h4 class="font-semibold">
												{$t('dashboard.interestedWorkerDialog.interestedOffers')}
											</h4>
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
											<h4 class="font-semibold">
												{$t('dashboard.interestedWorkerDialog.top3Terms')}
											</h4>
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
									</div>
								</div>

								<div class="border-t pt-3">
									<h4 class="mb-4 text-xl font-medium">
										{$t('dashboard.interestedWorkerDialog.additionalInfo')}
									</h4>

									{#if worker.userDesc}
										<div class="mb-4">
											<h5 class="mb-2 font-semibold">
												{$t('dashboard.interestedWorkerDialog.about')}
											</h5>
											<p class="text-sm text-gray-700">{worker.userDesc}</p>
										</div>
									{/if}

									<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
										<div>
											<h5 class="mb-2 font-semibold">
												{$t('dashboard.interestedWorkerDialog.otherSkills')}
											</h5>
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

										<div>
											<h5 class="mb-2 font-semibold">
												{$t('dashboard.interestedWorkerDialog.softSkills')}
											</h5>
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
									</div>
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				</Tabs.Content>

				<Tabs.Content value="messages">
					<CandidateChat bind:huntId bind:candidateId />
				</Tabs.Content>

				<Tabs.Content value="notes">
					<CandidateNotes bind:huntId bind:candidateId bind:notes={worker.notes} />
				</Tabs.Content>
			</Tabs.Root>
		{:else}
			<div class="p-4 text-center text-gray-500">
				{$t('dashboard.interestedWorkerDialog.noData')}
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
