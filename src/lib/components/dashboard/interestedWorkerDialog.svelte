<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Button from '$lib/components/ui/button/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { get } from 'svelte/store';
	import { t } from '$lib/i18n';
	import type { InterestedCandidateDetails, InterestedCandidateStats } from '@/scrubinClient';
	import { scrubinClient } from '@/scrubinClient/client';
	import {
		Award,
		Briefcase,
		Calendar,
		GraduationCap,
		Mail,
		Phone,
		Sparkle,
		Eye,
		MailOpen,
		MessageSquare,
		UserPlus,
		UserCog,
		Users,
		UserCheck,
		FileText,
		CheckCircle2,
		UserMinus
	} from 'lucide-svelte';
	import CandidateChat from './candidateChat.svelte';
	import CandidateNotes from './candidateNotes.svelte';

	let {
		open = $bindable(false),
		huntId = $bindable(0),
		candidateId = $bindable(0),
		type = $bindable('offer')
	}: {
		open: boolean;
		huntId: number;
		candidateId: number;
		type: 'offer' | 'apply';
	} = $props();

	let worker: InterestedCandidateDetails | null = $state(null);
	let workerStats: InterestedCandidateStats | null = $state(null);
	let isLoading = $state(false);
	let hasError = $state(false);
	let activeTab = $state('profile'); // profile, messages, notes
	let isProcessing = $state(false);
	let actionError = $state('');

	// Available pipeline statuses
	let availableStatuses = $derived.by(() => {
		const translate = get(t);
		return [
			{
				value: 'interested',
				label: translate('statistics.pipelineStatuses.interested.label'),
				icon: UserPlus
			},
			{
				value: 'under_review',
				label: translate('statistics.pipelineStatuses.under_review.label'),
				icon: UserCog
			},
			{
				value: 'meeting_scheduled',
				label: translate('statistics.pipelineStatuses.meeting_scheduled.label'),
				icon: Users
			},
			{
				value: 'screening_completed',
				label: translate('statistics.pipelineStatuses.screening_completed.label'),
				icon: UserCheck
			},
			{
				value: 'offer_made',
				label: translate('statistics.pipelineStatuses.offer_made.label'),
				icon: FileText
			},
			{
				value: 'accepted',
				label: translate('statistics.pipelineStatuses.accepted.label'),
				icon: CheckCircle2
			},
			{
				value: 'declined',
				label: translate('statistics.pipelineStatuses.declined.label'),
				icon: UserMinus
			}
		];
	});

	// Current status value for the select dropdown
	let currentStatus = $derived.by(() => {
		if (!worker?.status) return 'interested';
		// Map old status values to new ones
		const statusLower = worker.status.toLowerCase();
		if (statusLower === 'hired') return 'accepted';
		return statusLower;
	});

	$effect(() => {
		if (open && huntId && candidateId) {
			Promise.all([getWorker(), getWorkerStats()]);
		}
	});

	async function getWorker() {
		isLoading = true;
		hasError = false;
		try {
			// Use correct API endpoint based on candidate type
			const response =
				type === 'apply'
					? await scrubinClient.hunt.getInterestedApplicantDetails(huntId, candidateId)
					: await scrubinClient.hunt.getInterestedCandidateDetails(huntId, candidateId);
			worker = response;
		} catch (error) {
			console.error('Error fetching interested worker data:', error);
			hasError = true;
		} finally {
			isLoading = false;
		}
	}

	async function getWorkerStats() {
		try {
			// Use correct API endpoint based on candidate type
			const response = await scrubinClient.hunt.getInterestedCandidateStats(huntId, candidateId);
			workerStats = response;
		} catch (error) {
			console.error('Error fetching interested worker stats:', error);
			hasError = true;
		} finally {
			isLoading = false;
		}
	}

	async function handleStatusChange(newStatus: string) {
		if (!worker || !huntId || !candidateId || !newStatus) return;
		if (newStatus === currentStatus) return; // No change

		isProcessing = true;
		actionError = '';

		try {
			// Use the new unified endpoint
			await scrubinClient.hunt.updateInterestedCandidateStatus(huntId, candidateId, newStatus);

			// Reload hunt stats
			await scrubinClient.hunt.getHuntStats(huntId);

			// Refresh worker details
			await getWorker();
		} catch (error) {
			console.error(`Error changing status to ${newStatus}:`, error);
			actionError = $t('dashboard.interestedWorkerDialog.updateStatusError');
		} finally {
			isProcessing = false;
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
			<Dialog.Title class="flex items-center gap-4">
				{$t('dashboard.interestedWorkerDialog.title')}
				{#if workerStats}
					<div class="flex items-center gap-2">
						<Tooltip.Root>
							<Tooltip.Trigger>
								<div class="flex items-center gap-1 text-xs">
									<Eye class="h-3.5 w-3.5" />
									<span>{workerStats.offerOpens}</span>
								</div>
							</Tooltip.Trigger>
							<Tooltip.Content side="bottom">
								<span>{$t('statistics.offerOpens')}</span>
							</Tooltip.Content>
						</Tooltip.Root>
						<span class="text-muted-foreground">|</span>
						<Tooltip.Root>
							<Tooltip.Trigger>
								<div class="flex items-center gap-1 text-xs">
									<MailOpen class="h-3.5 w-3.5" />
									<span>{workerStats.offerEmailOpenedCount}</span>
								</div>
							</Tooltip.Trigger>
							<Tooltip.Content side="bottom">
								<span>{$t('statistics.offerEmailOpens')}</span>
							</Tooltip.Content>
						</Tooltip.Root>
						<span class="text-muted-foreground">|</span>
						<Tooltip.Root>
							<Tooltip.Trigger>
								<div class="flex items-center gap-1 text-xs">
									<MessageSquare class="h-3.5 w-3.5" />
									<span>{workerStats.chatEmailOpenedCount}</span>
									{#if workerStats.hasUnreadMessages}
										<span class="ml-1 inline-block h-2 w-2 rounded-full bg-red-500"></span>
									{/if}
								</div>
							</Tooltip.Trigger>
							<Tooltip.Content side="bottom">
								<span>Chat email opens</span>
							</Tooltip.Content>
						</Tooltip.Root>
					</div>
				{/if}
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
				<Tabs.List class="inline-flex w-auto items-center justify-start gap-2 self-start">
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

							{#if workerStats}
								<!-- engagement now next to dialog title; previous block removed -->
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
										<div class="flex flex-1 items-center justify-between">
											<span class="text-lg font-semibold text-gray-900"
												>{worker.firstName} {worker.lastName}</span
											>
											{#if worker.status}
												<div class="flex items-center gap-2">
													<span class="text-xs font-medium text-gray-500">
														{$t('dashboard.interestedWorkerDialog.currentStatus')}:
													</span>
													<span
														class="rounded-full px-2 py-1 text-xs font-medium
														{worker.status.toLowerCase() === 'interested'
															? 'bg-blue-100 text-blue-800'
															: worker.status.toLowerCase() === 'offer_made'
																? 'bg-yellow-100 text-yellow-800'
																: worker.status.toLowerCase() === 'hired'
																	? 'bg-green-100 text-green-800'
																	: worker.status.toLowerCase() === 'declined' ||
																		  worker.status.toLowerCase() === 'rejected'
																		? 'bg-red-100 text-red-800'
																		: 'bg-gray-100 text-gray-800'}"
													>
														{$t(
															`dashboard.interestedWorkerDialog.status.${worker.status.toLowerCase()}`
														)}
													</span>
												</div>
											{/if}
										</div>
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

							<!-- Candidate Status Dropdown -->
							<div class="mb-6 rounded-md border border-gray-200 bg-gray-50 p-4">
								<h4 class="mb-3 text-lg font-medium text-gray-800">
									{$t('dashboard.interestedWorkerDialog.actions')}
								</h4>

								{#if actionError}
									<div class="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
										{actionError}
									</div>
								{/if}

								<div class="flex flex-col gap-3">
									<div class="flex items-center gap-3">
										<label for="status-select" class="text-sm font-medium text-gray-700">
											{$t('dashboard.interestedWorkerDialog.currentStatus')}:
										</label>
										<Select.Root
											type="single"
											value={currentStatus}
											onValueChange={(value: string | undefined) => {
												if (value) handleStatusChange(value);
											}}
											disabled={isProcessing}
										>
											<Select.Trigger id="status-select" class="w-[280px]">
												{@const selectedStatus = availableStatuses.find(
													(s) => s.value === currentStatus
												)}
												{#if selectedStatus}
													{@const Icon = selectedStatus.icon}
													<div class="flex items-center gap-2">
														<Icon class="h-4 w-4" />
														<span>{selectedStatus.label}</span>
													</div>
												{:else}
													<span>{currentStatus}</span>
												{/if}
											</Select.Trigger>
											<Select.Content>
												<Select.Group>
													{#each availableStatuses as status}
														{@const Icon = status.icon}
														<Select.Item value={status.value}>
															<div class="flex items-center gap-2">
																<Icon class="h-4 w-4" />
																<span>{status.label}</span>
															</div>
														</Select.Item>
													{/each}
												</Select.Group>
											</Select.Content>
										</Select.Root>
									</div>

									{#if isProcessing}
										<div class="flex items-center gap-2 text-sm text-gray-600">
											<div
												class="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"
											></div>
											<span>Updating status...</span>
										</div>
									{/if}
								</div>
							</div>

							{#if workerStats}
								<!-- engagement moved above contact info; this duplicate block removed -->
							{/if}

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

								<div class="mt-4 border-t pt-3">
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
					{#if workerStats?.hasUnreadMessages}
						<div class="mb-3 flex items-center gap-2 rounded-md bg-red-50 p-2 text-sm text-red-800">
							<div class="h-2 w-2 rounded-full bg-red-600"></div>
							<span>{$t('dashboard.interestedWorkerDialog.unreadMessages')}</span>
						</div>
					{/if}
					<CandidateChat bind:huntId bind:candidateId />
				</Tabs.Content>

				<Tabs.Content value="notes">
					<CandidateNotes bind:huntId bind:candidateId notes={worker?.notes || ''} />
				</Tabs.Content>
			</Tabs.Root>
		{:else}
			<div class="p-4 text-center text-gray-500">
				{$t('dashboard.interestedWorkerDialog.noData')}
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
