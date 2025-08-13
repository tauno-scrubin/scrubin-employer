<script lang="ts">
	import { goto } from '$app/navigation';
	import { visible } from '$lib/components/dashboard/overlay';
	import DropdownComponent from '$lib/components/dropdownComponent.svelte';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Combobox } from '$lib/components/ui/combobox';
	import { ComboboxMulti } from '$lib/components/ui/combobox-multi';
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { locale } from '$lib/i18n';
	import type { CompanyPlanSummary, JobRequirementDto, PlanType } from '@/scrubinClient';
	import { scrubinClient } from '@/scrubinClient/client';
	import type { CodeNamePair } from '@/scrubinClient/models';
	import {
		AlertCircle,
		Check,
		ChevronLeft,
		Info,
		Loader2,
		Pen,
		Send,
		Sparkle,
		Users,
		X
	} from 'lucide-svelte';
	import showdown from 'showdown';
	import { onMount, tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { get } from 'svelte/store';
	import { slide } from 'svelte/transition';

	let {
		data
	}: {
		data: {
			chatSessionId: string;
			initialMessage: string;
		};
	} = $props();

	// Chat state
	let messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }> = $state(
		[]
	);
	let currentMessage = $state('');
	let isSending = $state(false);
	let isComplete = $state(false);
	let isActivating = $state(false);

	// Requirements state
	let jobRequirements: JobRequirementDto | null = $state(null);
	let missingRequiredFields: string[] = $state([]);
	let potentialReach: number | null = $state(null);
	let completionPercentage = $state(0);

	// Plan selection state
	let companyActivePlans = $state<CompanyPlanSummary[]>([]);
	let availableCurrencies = $state<CodeNamePair[]>([]);
	let availableCountries = $state<CodeNamePair[]>([]);
	let availableProfessions = $state<CodeNamePair[]>([]);
	let availableSpecialties = $state<CodeNamePair[]>([]);
	let availableLanguages = $state<CodeNamePair[]>([]);
	let availableSalaryPeriods = $state<CodeNamePair[]>([]);

	// Editable fields state
	let editableFields = $state({
		jobTitle: false,
		jobDescription: false,
		jobRequiredQualifications: false,
		jobRequiredWorkExperience: false,
		salaryStart: false,
		salaryEnd: false,
		salaryCurrency: false,
		salaryType: false,
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
		country: '',
		city: '',
		stateProvinceRegion: '' as string | string[],
		professionsV2: [] as number[],
		specializationV2: undefined as number | undefined,
		jobRequiredLanguages: [] as string[],
		huntPreferredCountries: [] as string[],
		huntOnlyCountries: [] as string[],
		companyContext: '',
		hiringContext: ''
	});

	let isEditing = $state(false);
	let isSaving = $state(false);
	let chatContainer: HTMLElement;
	// removed global edit/save; using per-field edit/save

	function editTargetCountries() {
		editableFields.targetOnlyCountries = true;
		editableFields.targetPreferredCountries = true;
	}

	onMount(async () => {
		companyActivePlans = await scrubinClient.company.getActivePlans();
		const lang = get(locale);
		const [countries, currencies, professions, specialties, languages, salaryPeriods] =
			await Promise.all([
				scrubinClient.data.getCountries(lang),
				scrubinClient.data.getCurrencies(lang),
				scrubinClient.data.getProfessions(lang),
				scrubinClient.data.getSpecialties(lang),
				scrubinClient.data.getLanguages(lang),
				scrubinClient.data.getSalaryPeriods(lang)
			]);
		availableCountries = countries;
		availableCurrencies = currencies;
		availableProfessions = professions;
		availableSpecialties = specialties;
		availableLanguages = languages;
		availableSalaryPeriods = salaryPeriods;

		// Load initial session data
		await loadSessionData();

		// Scroll to bottom after initial load
		setTimeout(() => {
			scrollToBottom();
		}, 200);
	});

	async function loadSessionData() {
		try {
			const sessionResponse = await scrubinClient.hunt.getChatSession(data.chatSessionId);

			// Update state from response
			jobRequirements = sessionResponse.currentRequirements;
			completionPercentage = sessionResponse.completionPercentage;
			isComplete = sessionResponse.isComplete;
			potentialReach =
				sessionResponse.potentialTotalCandidateReach !== undefined
					? sessionResponse.potentialTotalCandidateReach
					: null;

			// Update messages with the actual chat history, sorted by date (oldest first)
			const chatMessages = sessionResponse.chatMessages.items
				.map((msg) => ({
					role: msg.role as 'user' | 'assistant',
					content: msg.message,
					timestamp: new Date(msg.createdDateTime)
				}))
				.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

			messages = chatMessages;
			await scrollToBottom();
		} catch (error) {
			console.error('Error loading session data:', error);
			toast.error('Failed to load chat session. Please try again.');
		}
	}

	async function sendMessage(message: string) {
		if (!message.trim() || isSending) return;

		const userMessage = message.trim();
		currentMessage = '';
		isSending = true;

		// Add user message to chat
		messages = [...messages, { role: 'user', content: userMessage, timestamp: new Date() }];
		// Force immediate scroll after adding user message
		setTimeout(() => {
			scrollToBottom();
		}, 10);

		try {
			// Send message with existing session ID using v3 API
			const sessionResponse = await scrubinClient.hunt.requirementsChat({
				message: userMessage,
				chatSessionId: data.chatSessionId
			});

			// Update state from response
			jobRequirements = sessionResponse.currentRequirements;
			completionPercentage = sessionResponse.completionPercentage;
			isComplete = sessionResponse.isComplete;
			potentialReach =
				sessionResponse.potentialTotalCandidateReach !== undefined
					? sessionResponse.potentialTotalCandidateReach
					: null;

			// Update messages with the actual chat history, sorted by date (oldest first)
			const chatMessages = sessionResponse.chatMessages.items
				.map((msg) => ({
					role: msg.role as 'user' | 'assistant',
					content: msg.message,
					timestamp: new Date(msg.createdDateTime)
				}))
				.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

			messages = chatMessages;
			await scrollToBottom();

			// If complete, show success message
			if (isComplete) {
				toast.success('Requirements building completed!');
			}
		} catch (error) {
			console.error('Error sending message:', error);
			toast.error('Failed to send message. Please try again.');

			// Add error message to chat
			messages = [
				...messages,
				{
					role: 'assistant',
					content: 'Sorry, I encountered an error. Please try again.',
					timestamp: new Date()
				}
			];
		} finally {
			isSending = false;
		}
	}

	async function activateRequirements() {
		if (!jobRequirements?.id) return;

		try {
			visible.set(true);
			isActivating = true;

			// Use the first active plan type
			const activePlan = companyActivePlans?.find((plan) => plan.planActive);
			if (!activePlan) {
				toast.error('No active plan found. Please activate a plan in the Pricing section.');
				return;
			}

			const result = await scrubinClient.hunt.createHuntAndActivateFromRequirements(
				jobRequirements.id,
				activePlan.planType as PlanType
			);
			goto(`/dashboard/hunts/${result.huntId}`);
		} catch (error) {
			console.error('Error activating requirements:', error);
			toast.error('Failed to activate requirements. Please try again.');
		} finally {
			visible.set(false);
			isActivating = false;
		}
	}

	function formatCurrency(amount: number, currency: string): string {
		const currencySymbols: Record<string, string> = {
			EUR: '€',
			USD: '$',
			GBP: '£'
		};
		return `${currencySymbols[currency] || currency}${amount.toLocaleString()}`;
	}

	function goBack() {
		goto('/dashboard/progressive-chat-test');
	}

	// Effect to update edit values when jobRequirements change
	$effect(() => {
		if (jobRequirements) {
			editValues = {
				jobTitle: jobRequirements.jobTitle || '',
				jobDescription: jobRequirements.jobDescription || '',
				jobRequiredQualifications: jobRequirements.jobRequiredQualifications || '',
				jobRequiredWorkExperience: jobRequirements.jobRequiredWorkExperience || 0,
				salaryStart: jobRequirements.salary?.amountStart || 0,
				salaryEnd: jobRequirements.salary?.amountEnd || 0,
				salaryCurrency: jobRequirements.salary?.currency || '',
				salaryType: jobRequirements.salary?.typeV2 || jobRequirements.salary?.type || '',
				country: jobRequirements.country || '',
				address: jobRequirements.address?.address || '',
				city: jobRequirements.address?.city || '',
				stateProvinceRegion: jobRequirements.address?.stateProvinceRegion || [],
				professionsV2: jobRequirements.professionsV2 || [],
				specializationV2: jobRequirements.specializationV2 || undefined,
				jobRequiredLanguages: jobRequirements.jobRequiredLanguages || [],
				huntPreferredCountries:
					jobRequirements.countriesPreferredToSearch ||
					jobRequirements.huntInstructions?.preferredCountriesToSearch ||
					[],
				huntOnlyCountries:
					jobRequirements.countriesOnlyToSearch ||
					jobRequirements.huntInstructions?.onlyCountriesToSearch ||
					[],
				companyContext:
					jobRequirements.companyContext || jobRequirements.huntInstructions?.companyContext || '',
				hiringContext:
					jobRequirements.hiringContext || jobRequirements.huntInstructions?.hiringContext || ''
			};
		}
	});

	async function saveField(field: keyof typeof editableFields) {
		if (!jobRequirements?.id) return;
		isSaving = true;
		try {
			let updateData: any = {};
			if (
				field === 'salaryStart' ||
				field === 'salaryEnd' ||
				field === 'salaryCurrency' ||
				field === 'salaryType'
			) {
				// group under salary
				updateData = {
					salaryAmountStart: editValues.salaryStart
						? editValues.salaryStart
						: jobRequirements.salary?.amountStart,
					salaryAmountEnd: editValues.salaryEnd
						? editValues.salaryEnd
						: jobRequirements.salary?.amountEnd,
					salaryCurrency: editValues.salaryCurrency
						? editValues.salaryCurrency
						: jobRequirements.salary?.currency,
					salaryType: editValues.salaryType
						? editValues.salaryType
						: jobRequirements.salary?.typeV2 || jobRequirements.salary?.type
				};
			} else if (field === 'country' || field === 'city' || field === 'stateProvinceRegion') {
				// group under address & country
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

			await scrubinClient.hunt.updateRequirementFields(jobRequirements.id, updateData);
			await loadSessionData();

			Object.keys(editableFields).forEach((key) => {
				editableFields[key as keyof typeof editableFields] = false;
			});
			toast.success(`Updated successfully`);
		} catch (error) {
			console.error(`Failed to update ${field}:`, error);
			toast.error(`Failed to update ${field}. Please try again.`);
		} finally {
			isSaving = false;
		}
	}

	function startEditing(field: keyof typeof editableFields) {
		// Close any other open edit fields
		Object.keys(editableFields).forEach((key) => {
			editableFields[key as keyof typeof editableFields] = false;
		});

		// Open the selected field
		editableFields[field] = true;
		isEditing = true;
	}

	function cancelEditing(field: keyof typeof editableFields) {
		// Reset the field value
		if (jobRequirements) {
			if (field === 'jobTitle') editValues.jobTitle = jobRequirements.jobTitle || '';
			if (field === 'jobDescription')
				editValues.jobDescription = jobRequirements.jobDescription || '';
			if (field === 'jobRequiredQualifications')
				editValues.jobRequiredQualifications = jobRequirements.jobRequiredQualifications || '';
			if (field === 'jobRequiredWorkExperience')
				editValues.jobRequiredWorkExperience = jobRequirements.jobRequiredWorkExperience || 0;
			if (field === 'salaryStart')
				editValues.salaryStart = jobRequirements.salary?.amountStart || 0;
			if (field === 'salaryEnd') editValues.salaryEnd = jobRequirements.salary?.amountEnd || 0;
			if (field === 'salaryCurrency')
				editValues.salaryCurrency = jobRequirements.salary?.currency || '';
			if (field === 'salaryType') editValues.salaryType = jobRequirements.salary?.type || '';
			if (field === 'country') editValues.country = jobRequirements.country || '';
			if (field === 'address') editValues.address = jobRequirements.address?.address || '';
			if (field === 'city') editValues.city = jobRequirements.address?.city || '';
			if (field === 'stateProvinceRegion')
				editValues.stateProvinceRegion = jobRequirements.address?.stateProvinceRegion || [];
			if (field === 'professions') editValues.professionsV2 = jobRequirements.professionsV2 || [];
			if (field === 'specialization')
				editValues.specializationV2 = jobRequirements.specializationV2 || undefined;
			if (field === 'jobRequiredLanguages')
				editValues.jobRequiredLanguages = jobRequirements.jobRequiredLanguages || [];
			if (field === 'targetPreferredCountries' || field === 'targetOnlyCountries') {
				editValues.huntPreferredCountries =
					jobRequirements.huntInstructions?.preferredCountriesToSearch || [];
				editValues.huntOnlyCountries =
					jobRequirements.huntInstructions?.onlyCountriesToSearch || [];
			}
		}

		// Close edit mode
		editableFields[field] = false;

		// Check if we're still editing any field
		isEditing = Object.values(editableFields).some((value) => value);
	}

	async function scrollToBottom() {
		await tick();
		if (!chatContainer) return;

		chatContainer.scrollTop = chatContainer.scrollHeight;

		// Second scroll after paint
		requestAnimationFrame(() => {
			if (chatContainer) {
				chatContainer.scrollTop = chatContainer.scrollHeight;
			}
		});
	}

	// Auto-scroll when messages change
	$effect(() => {
		if (messages.length > 0) {
			setTimeout(() => {
				scrollToBottom();
			}, 50);
		}
	});

	// Auto-scroll when sending state changes (for AI thinking indicator)
	$effect(() => {
		if (isSending) {
			setTimeout(() => {
				scrollToBottom();
			}, 100);
		}
	});

	// Auto-scroll when currentMessage changes (when user sends message)
	$effect(() => {
		if (currentMessage === '' && messages.length > 0) {
			// This triggers when user sends a message (currentMessage gets cleared)
			setTimeout(() => {
				scrollToBottom();
			}, 20);
		}
	});

	// Function to convert markdown to HTML (simple implementation)
	function markdownToHtml(markdown: string): string {
		if (!markdown) return '';
		const converter = new showdown.Converter({
			flavor: 'github'
		});
		return converter.makeHtml(markdown);
	}
</script>

<div class="flex h-screen gap-6 p-6">
	<!-- Chat Section -->
	<div class="flex w-2/5 flex-col">
		<!-- Chat Header + Messages combined -->
		<div class="flex flex-1 flex-col overflow-hidden rounded-lg border bg-white shadow-sm">
			<div class="flex items-center justify-between p-4 shadow-sm">
				<div class="flex items-center gap-3">
					<Button onclick={goBack} variant="outline" size="sm" class="flex items-center gap-2">
						<ChevronLeft class="h-4 w-4" />
					</Button>
					<div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
						<Sparkle class="h-5 w-5 text-blue-600" />
					</div>
					<div>
						<h2 class="text-lg font-semibold text-gray-900">Requirements Assistant</h2>
						<p class="text-sm text-gray-500">Let's build your job requirements together</p>
					</div>
				</div>
			</div>

			<Separator />

			<!-- Chat Messages -->
			<div bind:this={chatContainer} class="flex-1 space-y-4 overflow-y-auto p-4">
				{#if messages.length === 0}
					<div class="flex h-full items-center justify-center">
						<div class="text-center">
							<Sparkle class="mx-auto h-12 w-12 text-gray-300" />
							<p class="mt-2 text-sm text-gray-500">AI is processing your request...</p>
						</div>
					</div>
				{:else}
					{#each messages as message, index}
						<div
							class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}"
							transition:slide={{ delay: 100, duration: 200 }}
						>
							<div
								class="max-w-[85%] rounded-lg px-3 py-2 {message.role === 'user'
									? 'bg-blue-600 text-white'
									: 'bg-gray-100 text-gray-900'}"
							>
								<p class="text-sm">{message.content}</p>
								<p class="mt-1 text-xs opacity-70">{message.timestamp.toLocaleTimeString()}</p>
							</div>
						</div>
					{/each}
				{/if}

				{#if isSending}
					<div class="flex justify-start" transition:slide={{ delay: 100, duration: 200 }}>
						<div class="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2">
							<Loader2 class="h-4 w-4 animate-spin text-gray-500" />
							<span class="text-sm text-gray-500">AI is thinking...</span>
						</div>
					</div>
				{/if}
			</div>
			<Separator />

			<!-- Chat Input -->
			<div class="border-t p-4">
				<form
					onsubmit={(e) => {
						e.preventDefault();
						sendMessage(currentMessage);
					}}
					class="flex gap-3"
				>
					<Textarea
						bind:value={currentMessage}
						placeholder="Type your message here... (Press Enter to send)"
						class="flex-1 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
						rows={1}
						onkeydown={(e) => {
							if (e.key === 'Enter' && !e.shiftKey) {
								e.preventDefault();
								if (currentMessage.trim() && !isSending) {
									sendMessage(currentMessage);
									setTimeout(() => {
										scrollToBottom();
									}, 10);
								}
							}
						}}
					/>
					<Button
						type="submit"
						disabled={!currentMessage.trim() || isSending}
						variant="default"
						size="sm"
						class="h-10 w-10 rounded-full p-0"
						onclick={() => {
							setTimeout(() => {
								scrollToBottom();
							}, 10);
						}}
					>
						{#if isSending}
							<Loader2 class="h-4 w-4 animate-spin" />
						{:else}
							<Send class="h-4 w-4" />
						{/if}
					</Button>
				</form>
			</div>
		</div>
	</div>

	<!-- Requirements Preview Section -->
	<div class="flex w-3/5 flex-col">
		<!-- Missing Fields Card -->
		{#if missingRequiredFields.length > 0}
			<div class="rounded-lg border bg-white p-4 shadow-sm">
				<div class="space-y-1">
					<p class="text-xs font-medium text-gray-700">Missing Fields</p>
					{#each missingRequiredFields as field}
						<div class="flex items-center gap-2">
							<AlertCircle class="h-3 w-3 text-amber-500" />
							<span class="text-xs text-gray-600">{field}</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Job Requirements Card -->
		{#if jobRequirements}
			<div class="flex-1 overflow-y-auto rounded-lg border bg-white p-4 shadow-sm">
				<div class="mb-4 flex items-center justify-between gap-3">
					<div class="flex items-center gap-3">
						<Sparkle fill="currentColor" strokeWidth="1" class="h-8 w-8 rotate-45 text-blue-500" />
						<h3 class="text-xl font-medium">Job Requirements</h3>
						{#if potentialReach !== null}
							<Tooltip.Root>
								<Tooltip.Trigger>
									<span
										class="inline-flex cursor-default items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
									>
										<Users class="h-3 w-3" />
										{potentialReach.toLocaleString()}
									</span>
								</Tooltip.Trigger>
								<Tooltip.Content side="top">Potential candidate reach</Tooltip.Content>
							</Tooltip.Root>
						{/if}
					</div>
					<div class="flex items-center gap-2"></div>
				</div>

				{#if isComplete}
					<Alert
						variant="success"
						class="mb-3 flex items-center justify-between gap-3 rounded-md border-green-200 bg-green-50 px-3 py-2 text-green-700"
					>
						<div class="flex items-center gap-2">
							<Check class="h-4 w-4" />
							<div>
								<AlertTitle class="m-0 text-sm font-medium">Ready to activate</AlertTitle>
								<AlertDescription class="m-0 text-xs"
									>All required fields are complete.</AlertDescription
								>
							</div>
						</div>
						{#if companyActivePlans && companyActivePlans.some((p) => p.planActive)}
							<Button
								onclick={activateRequirements}
								disabled={isActivating}
								variant="default"
								size="sm"
								class="gap-2 rounded-md shadow-sm"
							>
								{#if isActivating}
									<Loader2 class="h-4 w-4 animate-spin" />
									<span>Activating…</span>
								{:else}
									<Check class="h-4 w-4" />
									<span>Activate Hunt</span>
								{/if}
							</Button>
						{:else}
							<span
								class="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700"
								>Activate a plan to proceed</span
							>
						{/if}
					</Alert>
				{/if}

				{#if false}{/if}

				<div class="space-y-3 text-sm">
					<!-- Title (editable) -->
					<div class="group">
						{#if editableFields.jobTitle}
							<div class="flex w-full gap-2">
								<Input
									type="text"
									value={editValues.jobTitle}
									onchange={(e) => {
										editValues.jobTitle = e.currentTarget.value;
									}}
									class="flex-1"
								/>
								<Button
									size="icon"
									variant="default"
									onclick={() => saveField('jobTitle')}
									disabled={isSaving}
								>
									{#if isSaving}
										<Loader2 class="h-4 w-4 animate-spin" />
									{:else}
										<Check class="h-4 w-4" />
									{/if}
								</Button>
								<Button size="icon" variant="outline" onclick={() => cancelEditing('jobTitle')}>
									<X class="h-4 w-4" />
								</Button>
							</div>
						{:else}
							<div class="flex items-center gap-2">
								<p
									class={jobRequirements.jobTitle
										? 'text-lg font-semibold text-gray-900'
										: 'text-lg text-gray-500'}
								>
									{jobRequirements.jobTitle || 'Untitled role'}
								</p>
								<button
									class="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
									onclick={() => startEditing('jobTitle')}
								>
									<Pen class="h-3.5 w-3.5 text-gray-400 hover:text-primary" />
								</button>
							</div>
						{/if}
					</div>

					<!-- Header meta grid -->
					<div class="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
						<!-- Professions -->
						<div class="group rounded p-2 hover:bg-gray-50">
							<p class="text-[11px] uppercase tracking-wide text-muted-foreground">Professions</p>
							{#if editableFields.professions}
								<div class="mt-1 space-y-2">
									<ComboboxMulti
										items={availableProfessions.map((p) => ({ value: p.code, label: p.name }))}
										values={editValues.professionsV2.map(String)}
										onValuesChange={(vals) =>
											(editValues.professionsV2 = vals.map((v) => Number(v)))}
										placeholder="Select professions"
										searchPlaceholder="Search profession..."
										emptyText="No results"
										class="w-full"
									/>
									<div class="flex justify-end gap-2">
										<Button
											size="icon"
											variant="default"
											onclick={() => saveField('professions')}
											disabled={isSaving}
										>
											{#if isSaving}
												<Loader2 class="h-4 w-4 animate-spin" />
											{:else}
												<Check class="h-4 w-4" />
											{/if}
										</Button>
										<Button
											size="icon"
											variant="outline"
											onclick={() => cancelEditing('professions')}
										>
											<X class="h-4 w-4" />
										</Button>
									</div>
								</div>
							{:else}
								<div class="mt-1 flex flex-row flex-wrap items-center gap-2">
									{#if jobRequirements.professionsV2 && jobRequirements.professionsV2.length > 0}
										{#each jobRequirements.professionsV2 as profId}
											<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
												{availableProfessions.find((p) => Number(p.code) === profId)?.name ??
													profId}
											</span>
										{/each}
									{:else}
										<span class="text-gray-500">Not specified</span>
									{/if}
									<button
										class="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
										onclick={() => startEditing('professions')}
									>
										<Pen class="h-3.5 w-3.5 text-gray-400 hover:text-primary" />
									</button>
								</div>
							{/if}
						</div>

						<!-- Specialization -->
						<div class="group rounded p-2 hover:bg-gray-50">
							<p class="text-[11px] uppercase tracking-wide text-muted-foreground">
								Specialization
							</p>
							{#if editableFields.specialization}
								<div class="mt-1 space-y-2">
									<Combobox
										items={availableSpecialties.map((s) => ({ value: s.code, label: s.name }))}
										value={editValues.specializationV2 !== undefined
											? String(editValues.specializationV2)
											: undefined}
										onValueChange={(v) => {
											editValues.specializationV2 = v ? Number(v) : undefined;
										}}
										placeholder="Select specialization"
										searchPlaceholder="Search specialization..."
										emptyText="No results"
										class="w-full"
									/>
									<div class="flex justify-end gap-2">
										<Button
											size="icon"
											variant="default"
											onclick={() => saveField('specialization')}
											disabled={isSaving}
										>
											{#if isSaving}
												<Loader2 class="h-4 w-4 animate-spin" />
											{:else}
												<Check class="h-4 w-4" />
											{/if}
										</Button>
										<Button
											size="icon"
											variant="outline"
											onclick={() => cancelEditing('specialization')}
										>
											<X class="h-4 w-4" />
										</Button>
									</div>
								</div>
							{:else}
								<div class="mt-1 flex items-center gap-2">
									<p class={jobRequirements.specialization ? 'text-gray-900' : 'text-gray-500'}>
										{availableSpecialties.find(
											(s) => s.code === jobRequirements?.specializationV2?.toString()
										)?.name ||
											jobRequirements.specialization ||
											'Not specified'}
									</p>
									<button
										class="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
										onclick={() => startEditing('specialization')}
									>
										<Pen class="h-3.5 w-3.5 text-gray-400 hover:text-primary" />
									</button>
								</div>
							{/if}
						</div>

						<!-- Work experience -->
						<div class="group rounded p-2 hover:bg-gray-50">
							<p class="text-[11px] uppercase tracking-wide text-muted-foreground">
								Work experience
							</p>
							{#if editableFields.jobRequiredWorkExperience}
								<div class="mt-1 flex w-full gap-2">
									<Input
										type="number"
										value={editValues.jobRequiredWorkExperience}
										onchange={(e) => {
											editValues.jobRequiredWorkExperience = parseInt(e.currentTarget.value) || 0;
										}}
										class="flex-1"
										min="0"
									/>
									<Button
										size="icon"
										variant="default"
										onclick={() => saveField('jobRequiredWorkExperience')}
										disabled={isSaving}
									>
										{#if isSaving}
											<Loader2 class="h-4 w-4 animate-spin" />
										{:else}
											<Check class="h-4 w-4" />
										{/if}
									</Button>
									<Button
										size="icon"
										variant="outline"
										onclick={() => cancelEditing('jobRequiredWorkExperience')}
									>
										<X class="h-4 w-4" />
									</Button>
								</div>
							{:else}
								<div class="mt-1 flex items-center gap-2">
									<p
										class={jobRequirements.jobRequiredWorkExperience
											? 'text-gray-900'
											: 'text-gray-500'}
									>
										{jobRequirements.jobRequiredWorkExperience || 0} years
									</p>
									<button
										class="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
										onclick={() => startEditing('jobRequiredWorkExperience')}
									>
										<Pen class="h-3.5 w-3.5 text-gray-400 hover:text-primary" />
									</button>
								</div>
							{/if}
						</div>

						<!-- Location -->
						<div class="group rounded p-2 hover:bg-gray-50">
							<p class="text-[11px] uppercase tracking-wide text-muted-foreground">Location</p>
							{#if editableFields.country || editableFields.city || editableFields.stateProvinceRegion}
								<div class="mt-1 flex w-full flex-col gap-2">
									<div class="grid grid-cols-1 gap-2 md:grid-cols-3">
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
											placeholder="City"
											value={editValues.city}
											onchange={(e) => {
												editValues.city = e.currentTarget.value;
											}}
										/>
										<Input
											type="text"
											placeholder="Region/State/Province"
											value={editValues.stateProvinceRegion}
											onchange={(e) => {
												editValues.stateProvinceRegion = e.currentTarget.value;
											}}
										/>
									</div>
									<div class="flex justify-end gap-2">
										<Button
											size="icon"
											variant="default"
											onclick={() => saveField('country')}
											disabled={isSaving}
										>
											{#if isSaving}
												<Loader2 class="h-4 w-4 animate-spin" />
											{:else}
												<Check class="h-4 w-4" />
											{/if}
										</Button>
										<Button
											size="icon"
											variant="outline"
											onclick={() => {
												cancelEditing('country');
												cancelEditing('city');
												cancelEditing('stateProvinceRegion');
											}}
										>
											<X class="h-4 w-4" />
										</Button>
									</div>
								</div>
							{:else}
								<div class="mt-1 flex items-center gap-2">
									<p
										class={jobRequirements.address?.city ||
										jobRequirements.address?.stateProvinceRegion
											? 'text-gray-900'
											: 'text-gray-500'}
									>
										{availableCountries.find((c) => c.code === jobRequirements?.countryIso)?.name ||
											jobRequirements.country}, {jobRequirements.address?.city || ''}
										{jobRequirements.address?.stateProvinceRegion
											? Array.isArray(jobRequirements.address.stateProvinceRegion)
												? jobRequirements.address.stateProvinceRegion.join(', ')
												: jobRequirements.address.stateProvinceRegion
											: ''}
									</p>
									<button
										class="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
										onclick={() => {
											startEditing('country');
											startEditing('city');
											startEditing('stateProvinceRegion');
										}}
									>
										<Pen class="h-3.5 w-3.5 text-gray-400 hover:text-primary" />
									</button>
								</div>
							{/if}
						</div>

						<!-- Languages -->
						<div class="group rounded p-2 hover:bg-gray-50">
							<p class="text-[11px] uppercase tracking-wide text-muted-foreground">Languages</p>
							{#if editableFields.jobRequiredLanguages}
								<div class="mt-1 space-y-2">
									<ComboboxMulti
										items={availableLanguages.map((l) => ({ value: l.code, label: l.name }))}
										values={editValues.jobRequiredLanguages as string[]}
										onValuesChange={(vals) => (editValues.jobRequiredLanguages = vals)}
										placeholder="Select languages"
										searchPlaceholder="Search language..."
										emptyText="No results"
										class="w-full"
									/>
									<div class="flex justify-end gap-2">
										<Button
											size="icon"
											variant="default"
											onclick={() => saveField('jobRequiredLanguages')}
											disabled={isSaving}
										>
											{#if isSaving}
												<Loader2 class="h-4 w-4 animate-spin" />
											{:else}
												<Check class="h-4 w-4" />
											{/if}
										</Button>

										<Button
											size="icon"
											variant="outline"
											onclick={() => cancelEditing('jobRequiredLanguages')}
										>
											<X class="h-4 w-4" />
										</Button>
									</div>
								</div>
							{:else}
								<div class="mt-1 flex flex-wrap items-center gap-2">
									{#each jobRequirements.jobRequiredLanguages || [] as language}
										<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
											>{availableLanguages.find((l) => l.code === language)?.name || language}</span
										>
									{/each}
									{#if !jobRequirements.jobRequiredLanguages || jobRequirements.jobRequiredLanguages.length === 0}
										<span class="text-gray-500">Not specified</span>
									{/if}
									<button
										class="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
										onclick={() => startEditing('jobRequiredLanguages')}
									>
										<Pen class="h-3.5 w-3.5 text-gray-400 hover:text-primary" />
									</button>
								</div>
							{/if}
						</div>

						<!-- Salary -->
						<div class="group rounded p-2 hover:bg-gray-50">
							<p class="text-[11px] uppercase tracking-wide text-muted-foreground">Salary</p>
							{#if editableFields.salaryStart || editableFields.salaryEnd || editableFields.salaryCurrency || editableFields.salaryType}
								<div class="mt-1 flex w-full flex-col gap-2">
									<div class="grid grid-cols-1 gap-2 md:grid-cols-3">
										<Input
											type="number"
											placeholder="From"
											value={editValues.salaryStart}
											onchange={(e) => {
												editValues.salaryStart = parseInt(e.currentTarget.value) || 0;
											}}
											min="0"
										/>
										<Input
											type="number"
											placeholder="To"
											value={editValues.salaryEnd}
											onchange={(e) => {
												editValues.salaryEnd = parseInt(e.currentTarget.value) || 0;
											}}
											min="0"
										/>
										<DropdownComponent
											options={availableCurrencies}
											value={editValues.salaryCurrency}
											showLabelInBrackets={true}
											onValueChange={(value) => {
												editValues.salaryCurrency = value;
											}}
											placeholder="Currency"
											optionKey="code"
											labelKey="name"
										/>
									</div>
									<div>
										<DropdownComponent
											options={availableSalaryPeriods}
											value={editValues.salaryType}
											onValueChange={(value) => (editValues.salaryType = value)}
											placeholder="Salary period"
											optionKey="code"
											labelKey="name"
											class="w-full"
										/>
									</div>
									<div class="flex justify-end gap-2">
										<Button
											size="icon"
											variant="default"
											onclick={() => saveField('salaryStart')}
											disabled={isSaving}
										>
											{#if isSaving}
												<Loader2 class="h-4 w-4 animate-spin" />
											{:else}
												<Check class="h-4 w-4" />
											{/if}
										</Button>
										<Button
											size="icon"
											variant="outline"
											onclick={() => {
												cancelEditing('salaryStart');
												cancelEditing('salaryEnd');
												cancelEditing('salaryCurrency');
												cancelEditing('salaryType');
											}}
										>
											<X class="h-4 w-4" />
										</Button>
									</div>
								</div>
							{:else}
								<div class="mt-1 flex items-center gap-2">
									<p
										class={jobRequirements.salary?.amountStart || jobRequirements.salary?.amountEnd
											? 'text-gray-900'
											: 'text-gray-500'}
									>
										{#if jobRequirements.salary?.amountStart && jobRequirements.salary?.amountEnd}
											{formatCurrency(
												jobRequirements.salary.amountStart,
												jobRequirements.salary.currency
											)} - {formatCurrency(
												jobRequirements.salary.amountEnd,
												jobRequirements.salary.currency
											)}
											{availableSalaryPeriods.find(
												(p) => p.code === jobRequirements?.salary?.typeV2
											)?.name
												? `(${availableSalaryPeriods.find((p) => p.code === jobRequirements?.salary?.typeV2)?.name})`
												: ''}
										{:else if jobRequirements.salary?.amountStart && !jobRequirements.salary?.amountEnd}
											{formatCurrency(
												jobRequirements.salary.amountStart,
												jobRequirements.salary.currency
											)}
											{availableSalaryPeriods.find(
												(p) => p.code === jobRequirements?.salary?.typeV2
											)?.name
												? `(${availableSalaryPeriods.find((p) => p.code === jobRequirements?.salary?.typeV2)?.name})`
												: ''}
										{:else if jobRequirements.salary?.amountText}
											{jobRequirements.salary.amountText}
										{:else}
											Not specified
										{/if}
									</p>
									<button
										class="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
										onclick={() => {
											startEditing('salaryStart');
											startEditing('salaryEnd');
											startEditing('salaryCurrency');
											startEditing('salaryType');
										}}
									>
										<Pen class="h-3.5 w-3.5 text-gray-400 hover:text-primary" />
									</button>
								</div>
							{/if}
						</div>

						<!-- Target countries -->
						<div class="group rounded p-2 hover:bg-gray-50">
							<div class="flex items-center justify-between">
								<p class="text-[11px] uppercase tracking-wide text-muted-foreground">
									Target countries
								</p>
								{#if !editableFields.targetOnlyCountries && !editableFields.targetPreferredCountries}
									<button
										class="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
										onclick={editTargetCountries}
									>
										<Pen class="h-3.5 w-3.5 text-gray-400 hover:text-primary" />
									</button>
								{/if}
							</div>
							<!-- Only countries -->
							<div class="mt-2">
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-1.5">
										<p class="text-xs text-muted-foreground">Only</p>
										<Tooltip.Root>
											<Tooltip.Trigger>
												<button
													type="button"
													aria-label="Only countries info"
													title="Only countries info"
													class="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
												>
													<Info class="h-3 w-3" />
												</button>
											</Tooltip.Trigger>
											<Tooltip.Content side="top"
												>Limit search only to these countries' healthcare workers.</Tooltip.Content
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
											placeholder="Select only countries"
											searchPlaceholder="Search country..."
											emptyText="No results"
											class="w-full"
										/>
									</div>
								{:else}
									<div class="mt-1 flex flex-wrap gap-1">
										{#each jobRequirements.countriesOnlyToSearch || jobRequirements.huntInstructions?.onlyCountriesToSearch || [] as c}
											<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
												>{availableCountries.find((country) => country.code === c)?.name || c}</span
											>
										{/each}
										{#if (!jobRequirements.countriesOnlyToSearch || jobRequirements.countriesOnlyToSearch.length === 0) && (!jobRequirements.huntInstructions?.onlyCountriesToSearch || jobRequirements.huntInstructions.onlyCountriesToSearch.length === 0)}
											<span class="text-gray-500">Not specified</span>
										{/if}
									</div>
								{/if}
							</div>
							<!-- Preferred countries -->
							<div class="mt-4">
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-1.5">
										<p class="text-xs text-muted-foreground">Preferred</p>
										<Tooltip.Root>
											<Tooltip.Trigger>
												<button
													type="button"
													aria-label="Preferred countries info"
													title="Preferred countries info"
													class="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
												>
													<Info class="h-3 w-3" />
												</button>
											</Tooltip.Trigger>
											<Tooltip.Content side="top"
												>Score those healthcare professionals higher and start with them.</Tooltip.Content
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
											placeholder="Select preferred countries"
											searchPlaceholder="Search country..."
											emptyText="No results"
											class="w-full"
										/>
										<div class="flex justify-end gap-2">
											<Button
												size="icon"
												variant="default"
												onclick={() => saveField('targetPreferredCountries')}
												disabled={isSaving}
											>
												{#if isSaving}
													<Loader2 class="h-4 w-4 animate-spin" />
												{:else}
													<Check class="h-4 w-4" />
												{/if}
											</Button>
											<Button
												size="icon"
												variant="outline"
												onclick={() => {
													cancelEditing('targetOnlyCountries');
													cancelEditing('targetPreferredCountries');
												}}
											>
												<X class="h-4 w-4" />
											</Button>
										</div>
									</div>
								{:else}
									<div class="mt-1 flex flex-wrap gap-1">
										{#each jobRequirements.countriesPreferredToSearch || jobRequirements.huntInstructions?.preferredCountriesToSearch || [] as c}
											<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
												>{availableCountries.find((country) => country.code === c)?.name || c}</span
											>
										{/each}
										{#if (!jobRequirements.countriesPreferredToSearch || jobRequirements.countriesPreferredToSearch.length === 0) && (!jobRequirements.huntInstructions?.preferredCountriesToSearch || jobRequirements.huntInstructions.preferredCountriesToSearch.length === 0)}
											<span class="text-gray-500">Not specified</span>
										{/if}
									</div>
								{/if}
							</div>
						</div>
					</div>

					<!-- Details section -->
					<div class="mt-6 space-y-6 border-t pt-4">
						<!-- Description (not side-by-side) -->
						<div class="group">
							<h4 class="mb-2 text-base font-medium">Job Description</h4>
							{#if editableFields.jobDescription}
								<div class="flex w-full flex-col gap-2">
									<textarea
										value={editValues.jobDescription}
										onchange={(e) => {
											editValues.jobDescription = e.currentTarget.value;
										}}
										class="min-h-[100px] w-full rounded-md border p-2 text-sm"
									></textarea>
									<div class="flex justify-end gap-2">
										<Button
											size="icon"
											variant="default"
											onclick={() => saveField('jobDescription')}
											disabled={isSaving}
										>
											{#if isSaving}
												<Loader2 class="h-4 w-4 animate-spin" />
											{:else}
												<Check class="h-4 w-4" />
											{/if}
										</Button>
										<Button
											size="icon"
											variant="outline"
											onclick={() => cancelEditing('jobDescription')}
										>
											<X class="h-4 w-4" />
										</Button>
									</div>
								</div>
							{:else}
								<div class="flex items-start gap-2">
									<div
										class={jobRequirements.jobDescription ? 'prose text-gray-900' : 'text-gray-500'}
									>
										{@html markdownToHtml(jobRequirements.jobDescription || 'Not specified')}
									</div>
									<button
										class="mt-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
										onclick={() => startEditing('jobDescription')}
									>
										<Pen class="h-3.5 w-3.5 text-gray-400 hover:text-primary" />
									</button>
								</div>
							{/if}
						</div>

						<!-- Qualifications (not side-by-side) -->
						<div class="group">
							<h4 class="mb-2 text-base font-medium">Required Qualifications</h4>
							{#if editableFields.jobRequiredQualifications}
								<div class="flex w-full flex-col gap-2">
									<textarea
										value={editValues.jobRequiredQualifications}
										onchange={(e) => {
											editValues.jobRequiredQualifications = e.currentTarget.value;
										}}
										class="min-h-[100px] w-full rounded-md border p-2 text-sm"
									></textarea>
									<div class="flex justify-end gap-2">
										<Button
											size="icon"
											variant="default"
											onclick={() => saveField('jobRequiredQualifications')}
											disabled={isSaving}
										>
											{#if isSaving}
												<Loader2 class="h-4 w-4 animate-spin" />
											{:else}
												<Check class="h-4 w-4" />
											{/if}
										</Button>
										<Button
											size="icon"
											variant="outline"
											onclick={() => cancelEditing('jobRequiredQualifications')}
										>
											<X class="h-4 w-4" />
										</Button>
									</div>
								</div>
							{:else}
								<div class="flex items-start gap-2">
									<div
										class="text-sm {jobRequirements.jobRequiredQualifications
											? 'text-gray-900'
											: 'text-gray-500'}"
										style="white-space: pre-line;"
									>
										{jobRequirements.jobRequiredQualifications || 'Not specified'}
									</div>
									<button
										class="mt-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
										onclick={() => startEditing('jobRequiredQualifications')}
									>
										<Pen class="h-3.5 w-3.5 text-gray-400 hover:text-primary" />
									</button>
								</div>
							{/if}
						</div>

						<!-- Company & Hiring context for offer message background -->
						<div class="group">
							<div class="mb-2 flex items-center gap-2">
								<h4 class="text-base font-medium">Company context</h4>
								<Tooltip.Root>
									<Tooltip.Trigger>
										<button
											type="button"
											aria-label="Company context info"
											title="Company context info"
											class="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
										>
											<Info class="h-3 w-3" />
										</button>
									</Tooltip.Trigger>
									<Tooltip.Content side="top"
										>This is context for making offers and understanding company details. Private
										field (not shown to candidates).</Tooltip.Content
									>
								</Tooltip.Root>
							</div>
							{#if editableFields.companyContext}
								<div class="flex w-full flex-col gap-2">
									<textarea
										value={editValues.companyContext}
										onchange={(e: Event & { currentTarget: HTMLTextAreaElement }) => {
											editValues.companyContext = e.currentTarget.value;
										}}
										class="min-h-[80px] w-full rounded-md border p-2 text-sm"
									></textarea>
									<div class="flex justify-end gap-2">
										<Button
											size="icon"
											variant="default"
											onclick={() => saveField('companyContext')}
											disabled={isSaving}
										>
											{#if isSaving}
												<Loader2 class="h-4 w-4 animate-spin" />
											{:else}
												<Check class="h-4 w-4" />
											{/if}
										</Button>
										<Button
											size="icon"
											variant="outline"
											onclick={() => cancelEditing('companyContext')}
										>
											<X class="h-4 w-4" />
										</Button>
									</div>
								</div>
							{:else}
								<div class="flex items-start gap-2">
									<p
										class={jobRequirements.companyContext ||
										jobRequirements.huntInstructions?.companyContext
											? 'whitespace-pre-line text-sm text-gray-900'
											: 'text-sm text-gray-500'}
									>
										{jobRequirements.companyContext ||
											jobRequirements.huntInstructions?.companyContext ||
											'Not provided'}
									</p>
									<button
										class="mt-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
										onclick={() => startEditing('companyContext')}
									>
										<Pen class="h-3.5 w-3.5 text-gray-400 hover:text-primary" />
									</button>
								</div>
							{/if}
						</div>

						<div class="group">
							<div class="mb-2 flex items-center gap-2">
								<h4 class="text-base font-medium">Hiring context</h4>
								<Tooltip.Root>
									<Tooltip.Trigger>
										<button
											type="button"
											aria-label="Hiring context info"
											title="Hiring context info"
											class="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
										>
											<Info class="h-3 w-3" />
										</button>
									</Tooltip.Trigger>
									<Tooltip.Content side="top"
										>Special conditions that cannot be inserted elsewhere, such as special bonuses
										and constraints. Private field (not shown to candidates).</Tooltip.Content
									>
								</Tooltip.Root>
							</div>
							{#if editableFields.hiringContext}
								<div class="flex w-full flex-col gap-2">
									<textarea
										value={editValues.hiringContext}
										onchange={(e: Event & { currentTarget: HTMLTextAreaElement }) => {
											editValues.hiringContext = e.currentTarget.value;
										}}
										class="min-h-[80px] w-full rounded-md border p-2 text-sm"
									></textarea>
									<div class="flex justify-end gap-2">
										<Button
											size="icon"
											variant="default"
											onclick={() => saveField('hiringContext')}
											disabled={isSaving}
										>
											{#if isSaving}
												<Loader2 class="h-4 w-4 animate-spin" />
											{:else}
												<Check class="h-4 w-4" />
											{/if}
										</Button>
										<Button
											size="icon"
											variant="outline"
											onclick={() => cancelEditing('hiringContext')}
										>
											<X class="h-4 w-4" />
										</Button>
									</div>
								</div>
							{:else}
								<div class="flex items-start gap-2">
									<p
										class={jobRequirements.hiringContext ||
										jobRequirements.huntInstructions?.hiringContext
											? 'whitespace-pre-line text-sm text-gray-900'
											: 'text-sm text-gray-500'}
									>
										{jobRequirements.hiringContext ||
											jobRequirements.huntInstructions?.hiringContext ||
											'Not provided'}
									</p>
									<button
										class="mt-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
										onclick={() => startEditing('hiringContext')}
									>
										<Pen class="h-3.5 w-3.5 text-gray-400 hover:text-primary" />
									</button>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Potential Reach Card -->
		{#if false}{/if}
	</div>
</div>
