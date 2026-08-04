<script lang="ts">
	import { goto } from '$app/navigation';
	import { visible } from './overlay';
	import { scrubinClient, currentUser } from '@/scrubinClient/client';
	import { toast } from 'svelte-sonner';
	import { slide } from 'svelte/transition';
	import Textarea from '../ui/textarea/textarea.svelte';
	import Button from '../ui/button/button.svelte';
	import { FileText, Loader2, Paperclip, Sparkle, X } from 'lucide-svelte';
	import { t } from '$lib/i18n';

	const MAX_PROMPT_CHARS = 5000;
	const MAX_FILE_BYTES = 15 * 1024 * 1024;
	const ACCEPTED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tif', '.tiff'];
	const ACCEPTED_MIME_TYPES = new Set([
		'application/pdf',
		'application/msword',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'image/png',
		'image/jpeg',
		'image/jpg',
		'image/gif',
		'image/webp',
		'image/bmp',
		'image/tiff'
	]);

	let searchText: string = $state('');
	let isLoading: boolean = $state(false);
	let inputFocused: boolean = $state(false);
	let selectedFile: File | null = $state(null);
	let fileInputEl: HTMLInputElement | null = $state(null);

	const canSubmit = $derived(searchText.trim().length > 0 || selectedFile !== null);

	const submitSearch = async (event: SubmitEvent) => {
		event.preventDefault();
		searchRequirements(searchText);
	};

	function isAllowedFile(file: File): boolean {
		if (ACCEPTED_MIME_TYPES.has(file.type.toLowerCase())) return true;
		const lowerName = file.name.toLowerCase();
		return ACCEPTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
	}

	function openFilePicker() {
		fileInputEl?.click();
	}

	function onFileSelected(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0] ?? null;
		input.value = '';
		if (!file) return;

		if (!isAllowedFile(file)) {
			toast.error($t('dashboard.searchView.unsupportedFileType'));
			return;
		}
		if (file.size > MAX_FILE_BYTES) {
			toast.error($t('dashboard.searchView.fileTooLarge'));
			return;
		}

		selectedFile = file;
		inputFocused = true;
	}

	function clearSelectedFile() {
		selectedFile = null;
	}

	export async function searchRequirements(inputText?: string) {
		const textToSearch = (inputText ?? searchText).trim();
		if (!textToSearch && !selectedFile) return;

		visible.set(true);
		isLoading = true;

		try {
			if (inputText) {
				searchText = inputText;
			}

			let fileId: number | undefined;
			if (selectedFile) {
				const uploaded = await scrubinClient.portal.uploadFile(selectedFile);
				fileId = uploaded.id;
			}

			const result = await scrubinClient.hunt.requirementsChat({
				message: textToSearch || undefined,
				fileId
			});

			goto(`/dashboard/hunts/requirements/${result.jobRequirementId}`);
		} catch (error) {
			console.error('Error searching requirements:', error);
			toast.error($t('dashboard.searchView.errorAnalyzingRequirements') + error);
		} finally {
			visible.set(false);
			isLoading = false;
		}
	}
</script>

<div class="space-y-6">
	<!-- Search Input Card -->
	<div class="group/search mb-8 rounded-md bg-gradient-to-br from-blue-50 to-blue-100/50 p-8">
		<div class="mb-2 flex flex-col items-start gap-4">
			<div class="text-blue-600">
				<Sparkle
					fill="currentColor"
					class="h-6 w-6 rotate-45 transition-all duration-200 group-hover/search:rotate-90"
				/>
			</div>
			<h1 class="text-3xl font-medium">
				{$t('dashboard.searchView.welcomeBack', { name: $currentUser?.firstName || '' })}
			</h1>
		</div>

		<div class="rounded-lg border bg-white p-4 shadow-sm">
			<form
				onsubmit={submitSearch}
				class="group relative flex flex-col items-center"
			>
				<input
					bind:this={fileInputEl}
					type="file"
					class="hidden"
					accept=".pdf,.doc,.docx,image/*,.png,.jpg,.jpeg,.gif,.webp,.bmp,.tif,.tiff,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
					onchange={onFileSelected}
				/>
				<Textarea
					bind:value={searchText}
					maxlength={MAX_PROMPT_CHARS}
					onfocus={() => (inputFocused = true)}
					onblur={() => !searchText && !selectedFile && (inputFocused = false)}
					placeholder={$t('dashboard.searchView.searchPlaceholder')}
					class="flex-1 resize-none border-0 bg-transparent p-0 px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
				/>
				{#if selectedFile}
					<div
						transition:slide={{ delay: 50, duration: 150 }}
						class="mt-3 flex w-full items-center gap-2 rounded-md border border-blue-100 bg-blue-50/70 px-3 py-2 text-sm text-blue-900"
					>
						<FileText class="h-4 w-4 shrink-0 text-blue-600" />
						<span class="min-w-0 flex-1 truncate">{selectedFile.name}</span>
						<button
							type="button"
							class="rounded p-1 text-blue-700 hover:bg-blue-100"
							onclick={clearSelectedFile}
							aria-label={$t('dashboard.searchView.removeFile')}
						>
							<X class="h-4 w-4" />
						</button>
					</div>
				{/if}
				<div
					transition:slide={{ delay: 100, duration: 200 }}
					class="mt-2 flex w-full items-end justify-between gap-2"
				>
					<span class="text-xs text-gray-400">{searchText.length}/{MAX_PROMPT_CHARS}</span>
					<div class="flex items-center gap-2">
						<Button
							type="button"
							variant="outline"
							class="h-10 rounded-full px-3"
							onclick={openFilePicker}
							disabled={isLoading}
							aria-label={$t('dashboard.searchView.attachFile')}
							title={$t('dashboard.searchView.attachFileHint')}
						>
							<Paperclip class="h-4 w-4" />
						</Button>
						<Button
							type="submit"
							variant="default"
							disabled={!canSubmit || isLoading}
							class="h-10 rounded-full bg-blue-600 px-6 transition-all duration-200 hover:bg-blue-700"
						>
							{#if isLoading}
								<Loader2 class="h-5 w-5 animate-spin" />
							{:else}
								<div class="flex items-center gap-2">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="20"
										height="20"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path d="M22 2L11 13"></path>
										<path d="M22 2l-7 20-4-9-9-4 20-7z"></path>
									</svg>
									<span>{$t('dashboard.searchView.search')}</span>
								</div>
							{/if}
						</Button>
					</div>
				</div>
			</form>
		</div>

		<!-- Description with FAQ link -->
		<p class="mt-3 text-left text-sm text-gray-600">
			{$t('dashboard.searchView.howScrubinWorks')}
			<a href="/dashboard/faq" class="text-blue-600 hover:underline">
				{$t('dashboard.searchView.readHere')}
			</a>
		</p>
		<p class="mt-1 text-left text-xs text-gray-500">
			{$t('dashboard.searchView.attachFileHint')}
		</p>
	</div>
</div>
