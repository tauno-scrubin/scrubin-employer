<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { JobRequirementDto, CompanyPlanSummary, PlanType, Currency } from '@/scrubinClient';
	import { scrubinClient } from '@/scrubinClient/client';
	import showdown from 'showdown';
	import { t } from '$lib/i18n';
	import {
		AlertCircle,
		Check,
		ChevronLeft,
		Loader2,
		Send,
		Sparkle,
		Users,
		Pen,
		X
	} from 'lucide-svelte';

	import { toast } from 'svelte-sonner';
	import { slide } from 'svelte/transition';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { goto } from '$app/navigation';
	import { visible } from '$lib/components/dashboard/overlay';
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
	import DropdownComponent from '$lib/components/dropdownComponent.svelte';
	import { onMount, tick } from 'svelte';

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

	let converter = new showdown.Converter();

	// Requirements state
	let jobRequirements: JobRequirementDto | null = $state(null);
	let completionPercentage = $state(0);
	let missingRequiredFields: string[] = $state([]);
	let potentialCandidates: any[] = $state([]);
	let potentialReach: number | null = $state(null);

	// Plan selection state
	let companyActivePlans = $state<CompanyPlanSummary[]>([]);
	let selectedPlanType = $state<PlanType | null>(null);
	let showPlanActivationMessage = $state(false);
	let availableCurrencies = $state<Currency[]>([]);
	let availableCountries = $state<string[]>([]);

	// Editable fields state
	let editableFields = $state({
		jobTitle: false,
		jobDescription: false,
		jobRequiredQualifications: false,
		jobRequiredWorkExperience: false,
		salaryStart: false,
		salaryEnd: false,
		salaryCurrency: false,
		country: false,
		city: false,
		address: false,
		stateProvinceRegion: false
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
		country: '',
		city: '',
		stateProvinceRegion: '' as string | string[]
	});

	let isEditing = $state(false);
	let isSaving = $state(false);
	let chatContainer: HTMLElement;

	onMount(async () => {
		companyActivePlans = await scrubinClient.company.getActivePlans();
		availableCurrencies = await scrubinClient.company.getCurrencies();
		availableCountries = await scrubinClient.company.getCountries();

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

	function selectPlan(planType: PlanType) {
		selectedPlanType = planType;

		// Check if plan is active
		if (
			companyActivePlans &&
			!companyActivePlans.some(
				(plan: CompanyPlanSummary) => plan.planType === planType && plan.planActive
			)
		) {
			showPlanActivationMessage = true;
		} else {
			showPlanActivationMessage = false;
		}
	}

	function canBeActivated(
		activePlans: CompanyPlanSummary[],
		selectedPlan: PlanType | null,
		isActivatingNow: boolean
	): boolean {
		if (isActivatingNow) return false;
		if (!selectedPlan) return false;

		const isPlanActive = activePlans.some(
			(plan: CompanyPlanSummary) => plan.planType === selectedPlan && plan.planActive
		);

		return isPlanActive;
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

			const result = await scrubinClient.hunt.createHuntFromRequirements(
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

	function getTargetCountries(
		req: JobRequirementDto | null
	): { label: string; countries: string[] } | null {
		if (!req?.huntInstructions) return null;
		const { onlyCountriesToSearch, preferredCountriesToSearch } = req.huntInstructions;
		if (onlyCountriesToSearch && onlyCountriesToSearch.length > 0) {
			return { label: 'Target countries', countries: onlyCountriesToSearch };
		}
		if (preferredCountriesToSearch && preferredCountriesToSearch.length > 0) {
			return { label: 'Preferred countries', countries: preferredCountriesToSearch };
		}
		return null;
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
				country: jobRequirements.country || '',
				address: jobRequirements.address?.address || '',
				city: jobRequirements.address?.city || '',
				stateProvinceRegion: jobRequirements.address?.stateProvinceRegion || []
			};
		}
	});

	async function saveField(field: keyof typeof editableFields) {
		if (!jobRequirements?.id) return;
		isSaving = true;
		try {
			let updateData: any = {};
			if (field === 'salaryStart' || field === 'salaryEnd' || field === 'salaryCurrency') {
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
						: jobRequirements.salary?.currency
				};
			} else if (field === 'country' || field === 'city' || field === 'stateProvinceRegion') {
				// group under address & country
				updateData = {
					country: editValues.country,
					address: editValues.address,
					city: editValues.city,
					stateProvinceRegion: editValues.stateProvinceRegion
				};
			} else {
				updateData = { [field]: editValues[field] };
			}

			// Note: This would need to be implemented in the API
			// const updatedRequirements = await scrubinClient.hunt.updateRequirementFields(
			// 	jobRequirements.id,
			// 	updateData
			// );
			// jobRequirements = updatedRequirements;

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
			if (field === 'country') editValues.country = jobRequirements.country || '';
			if (field === 'address') editValues.address = jobRequirements.address?.address || '';
			if (field === 'city') editValues.city = jobRequirements.address?.city || '';
			if (field === 'stateProvinceRegion')
				editValues.stateProvinceRegion = jobRequirements.address?.stateProvinceRegion || [];
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
		console.log('isSending', isSending);
		if (isSending) {
			console.log('isSending', isSending);
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
		// 		console.log(markdown);
		// 		const converter = new showdown.Converter({
		// 			ghCompatibleHeaderId: true,
		// 			tables: true,
		// 			simplifiedAutoLink: true,
		// 			strikethrough: true,
		// 			tasklists: true,
		// 			smoothLivePreview: true,
		// 			emoji: true,
		// 			openLinksInNewWindow: true,
		// 			ghCodeBlocks: true,
		// 			requireSpaceBeforeHeadingText: true,
		// 			backslashEscapesHTMLTags: true,
		// 			underline: true,
		// 			simpleLineBreaks: true
		// });
		return converter.makeHtml(markdown);
		return (
			markdown
				// Bold text
				.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
				// Italic text
				.replace(/\*(.*?)\*/g, '<em>$1</em>')
				// Headers
				.replace(/^### (.*$)/gim, '<h3>$1</h3>')
				.replace(/^## (.*$)/gim, '<h2>$1</h2>')
				.replace(/^# (.*$)/gim, '<h1>$1</h1>')
				// Lists
				.replace(/^\* (.*$)/gim, '<li>$1</li>')
				.replace(/^- (.*$)/gim, '<li>$1</li>')
				// Line breaks
				.replace(/\n/g, '<br>')
		);
	}
</script>

<div class="flex h-screen gap-6 p-6">
	<!-- Chat Section -->
	<div class="flex w-2/5 flex-col">
		<!-- Chat Header + Messages combined -->
		<div class="flex flex-1 flex-col overflow-hidden rounded-lg border bg-white shadow-sm">
			<div class="flex items-center justify-between p-4">
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
				<div class="mb-4 flex items-center gap-3">
					<Sparkle fill="currentColor" strokeWidth="1" class="h-8 w-8 rotate-45 text-blue-500" />
					<h3 class="text-xl font-medium">Job Requirements</h3>
				</div>

				{#if isComplete && jobRequirements}
					{#if companyActivePlans && companyActivePlans.some((plan) => plan.planActive)}
						<div class="mb-4">
							<Button
								onclick={activateRequirements}
								disabled={isActivating}
								variant="default"
								size="sm"
								class="w-full"
							>
								{#if isActivating}
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
									Activating...
								{:else}
									<Check class="mr-2 h-4 w-4" />
									Activate Hunt
								{/if}
							</Button>
						</div>
					{:else}
						<div
							class="mb-4 flex items-center gap-2 rounded bg-amber-50 p-3 text-sm text-amber-600"
						>
							<AlertCircle class="h-4 w-4" />
							<p>Please activate a plan in the Pricing section to continue</p>
						</div>
					{/if}
				{/if}

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
							<div class="mt-1 flex flex-row flex-wrap gap-2">
								{#each jobRequirements.professions || [] as profession}
									<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
										>{profession}</span
									>
								{/each}
								{#if !jobRequirements.professions || jobRequirements.professions.length === 0}
									<span class="text-gray-500">Not specified</span>
								{/if}
							</div>
						</div>

						<!-- Specialization -->
						<div class="rounded p-2 hover:bg-gray-50">
							<p class="text-[11px] uppercase tracking-wide text-muted-foreground">
								Specialization
							</p>
							<p
								class={jobRequirements.specialization ? 'mt-1 text-gray-900' : 'mt-1 text-gray-500'}
							>
								{jobRequirements.specialization || 'Not specified'}
							</p>
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
										<DropdownComponent
											options={availableCountries}
											value={editValues.country}
											justString={true}
											onValueChange={(value) => {
												editValues.country = value;
											}}
											placeholder="Country"
											optionKey="code"
											labelKey="name"
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
											size="sm"
											variant="default"
											onclick={() => saveField('country')}
											disabled={isSaving}
										>
											{#if isSaving}
												<Loader2 class="mr-2 h-4 w-4 animate-spin" />
												Saving
											{:else}
												<Check class="mr-2 h-4 w-4" />
												Save
											{/if}
										</Button>
										<Button
											size="sm"
											variant="outline"
											onclick={() => {
												cancelEditing('country');
												cancelEditing('city');
												cancelEditing('stateProvinceRegion');
											}}
										>
											<X class="mr-2 h-4 w-4" />
											Cancel
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
										{jobRequirements.country}, {jobRequirements.address?.city || ''}
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
						<div class="rounded p-2 hover:bg-gray-50">
							<p class="text-[11px] uppercase tracking-wide text-muted-foreground">Languages</p>
							<div class="mt-1 flex flex-wrap gap-1">
								{#each jobRequirements.jobRequiredLanguages || [] as language}
									<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
										>{language}</span
									>
								{/each}
								{#if !jobRequirements.jobRequiredLanguages || jobRequirements.jobRequiredLanguages.length === 0}
									<span class="text-gray-500">Not specified</span>
								{/if}
							</div>
						</div>

						<!-- Salary -->
						<div class="group rounded p-2 hover:bg-gray-50">
							<p class="text-[11px] uppercase tracking-wide text-muted-foreground">Salary</p>
							{#if editableFields.salaryStart || editableFields.salaryEnd || editableFields.salaryCurrency}
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
									<div class="flex justify-end gap-2">
										<Button
											size="sm"
											variant="default"
											onclick={() => saveField('salaryStart')}
											disabled={isSaving}
										>
											{#if isSaving}
												<Loader2 class="mr-2 h-4 w-4 animate-spin" />
												Saving
											{:else}
												<Check class="mr-2 h-4 w-4" />
												Save
											{/if}
										</Button>
										<Button
											size="sm"
											variant="outline"
											onclick={() => {
												cancelEditing('salaryStart');
												cancelEditing('salaryEnd');
												cancelEditing('salaryCurrency');
											}}
										>
											<X class="mr-2 h-4 w-4" />
											Cancel
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
											{jobRequirements.salary.type ? `(${jobRequirements.salary.type})` : ''}
										{:else if jobRequirements.salary?.amountStart && !jobRequirements.salary?.amountEnd}
											{formatCurrency(
												jobRequirements.salary.amountStart,
												jobRequirements.salary.currency
											)}
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
										}}
									>
										<Pen class="h-3.5 w-3.5 text-gray-400 hover:text-primary" />
									</button>
								</div>
							{/if}
						</div>

						<!-- Target countries from huntInstructions -->
						{#if getTargetCountries(jobRequirements)}
							<div class="rounded p-2 hover:bg-gray-50">
								<p class="text-[11px] uppercase tracking-wide text-muted-foreground">
									{getTargetCountries(jobRequirements)?.label}
								</p>
								<div class="mt-1 flex flex-wrap gap-1">
									{#each getTargetCountries(jobRequirements)?.countries || [] as c}
										<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{c}</span>
									{/each}
								</div>
							</div>
						{/if}
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
											size="sm"
											variant="default"
											onclick={() => saveField('jobDescription')}
											disabled={isSaving}
										>
											{#if isSaving}
												<Loader2 class="mr-2 h-4 w-4 animate-spin" />
												Saving
											{:else}
												<Check class="mr-2 h-4 w-4" />
												Save
											{/if}
										</Button>
										<Button
											size="sm"
											variant="outline"
											onclick={() => cancelEditing('jobDescription')}
										>
											<X class="mr-2 h-4 w-4" />
											Cancel
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
											size="sm"
											variant="default"
											onclick={() => saveField('jobRequiredQualifications')}
											disabled={isSaving}
										>
											{#if isSaving}
												<Loader2 class="mr-2 h-4 w-4 animate-spin" />
												Saving
											{:else}
												<Check class="mr-2 h-4 w-4" />
												Save
											{/if}
										</Button>
										<Button
											size="sm"
											variant="outline"
											onclick={() => cancelEditing('jobRequiredQualifications')}
										>
											<X class="mr-2 h-4 w-4" />
											Cancel
										</Button>
									</div>
								</div>
							{:else}
								<div
									class="text-sm {jobRequirements.jobRequiredQualifications
										? 'text-gray-900'
										: 'text-gray-500'}"
									style="white-space: pre-line;"
								>
									{jobRequirements.jobRequiredQualifications || 'Not specified'}
								</div>
							{/if}
						</div>

						<!-- Company & Hiring context for offer message background -->
						<div>
							<h4 class="mb-2 text-base font-medium">Company context</h4>
							<p
								class={jobRequirements.huntInstructions?.companyContext
									? 'whitespace-pre-line text-sm text-gray-900'
									: 'text-sm text-gray-500'}
							>
								{jobRequirements.huntInstructions?.companyContext || 'Not provided'}
							</p>
						</div>

						<div>
							<h4 class="mb-2 text-base font-medium">Hiring context</h4>
							<p
								class={jobRequirements.huntInstructions?.hiringContext
									? 'whitespace-pre-line text-sm text-gray-900'
									: 'text-sm text-gray-500'}
							>
								{jobRequirements.huntInstructions?.hiringContext || 'Not provided'}
							</p>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Potential Reach Card -->
		{#if potentialReach !== null}
			<div class="rounded-lg border bg-white p-4 shadow-sm">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
						<Users class="h-5 w-5 text-green-600" />
					</div>
					<div>
						<p class="text-sm font-medium text-gray-900">Potential Reach</p>
						<p class="text-2xl font-bold text-green-600">{potentialReach.toLocaleString()}</p>
						<p class="text-xs text-gray-500">candidates available</p>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
