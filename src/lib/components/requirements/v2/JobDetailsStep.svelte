<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import MarkdownToolbar from '$lib/components/ui/markdown-toolbar/MarkdownToolbar.svelte';
	import {
		markdownToHtml,
		htmlToMarkdown,
		toggleBold,
		toggleItalic,
		toggleHeading,
		insertUnorderedList,
		insertOrderedList,
		insertLink,
		insertCode,
		setupKeyboardShortcuts
	} from '$lib/components/ui/markdown-toolbar/markdownEditor';
	import { scrubinClient } from '@/scrubinClient/client';
	import type { JobRequirementDto } from '@/scrubinClient';
	import { toast } from 'svelte-sonner';
	import { Sparkles, FileText, Info, Loader2 } from 'lucide-svelte';
	import { t } from '$lib/i18n';
	import { onMount, onDestroy } from 'svelte';

	let {
		requirement = $bindable<JobRequirementDto>(),
		requirementId
	}: {
		requirement: JobRequirementDto;
		requirementId: number;
	} = $props();

	let isSaving = $state(false);
	let isGeneratingDescription = $state(false);
	let isGeneratingQualifications = $state(false);

	// Local state for form fields (markdown stored for saving)
	let jobDescription = $state(requirement.jobDescription || '');
	let jobRequiredQualifications = $state(requirement.jobRequiredQualifications || '');

	// Rich text editor refs (contenteditable)
	let descriptionEditor: HTMLDivElement;
	let qualificationsEditor: HTMLDivElement;

	// Cleanup functions for keyboard shortcuts
	let cleanupDescriptionShortcuts: (() => void) | null = null;
	let cleanupQualificationsShortcuts: (() => void) | null = null;

	async function saveField(field: string, value: any) {
		if (!requirementId) return;

		isSaving = true;
		try {
			const updateData: any = {};
			updateData[field] = value;

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

	function handleDescriptionBlur() {
		if (!descriptionEditor) return;

		const markdown = htmlToMarkdown(descriptionEditor.innerHTML);
		jobDescription = markdown;

		if (markdown !== requirement.jobDescription) {
			saveField('jobDescription', markdown);
		}
	}

	function handleQualificationsBlur() {
		if (!qualificationsEditor) return;

		const markdown = htmlToMarkdown(qualificationsEditor.innerHTML);
		jobRequiredQualifications = markdown;

		if (markdown !== requirement.jobRequiredQualifications) {
			saveField('jobRequiredQualifications', markdown);
		}
	}

	async function generateDescription() {
		isGeneratingDescription = true;
		try {
			const response = await scrubinClient.hunt.generateJobDescription(requirementId);

			if (response.jobDescription) {
				jobDescription = response.jobDescription;

				if (descriptionEditor) {
					descriptionEditor.innerHTML = markdownToHtml(jobDescription);
				}

				await saveField('jobDescription', jobDescription);
			}
		} catch (error) {
			console.error('Failed to generate description:', error);
			toast.error($t('requirementsV2.errors.failedToGenerateDescription'));
		} finally {
			isGeneratingDescription = false;
		}
	}

	async function generateQualifications() {
		isGeneratingQualifications = true;
		try {
			const response = await scrubinClient.hunt.generateJobQualifications(requirementId);

			if (response.jobRequiredQualifications) {
				jobRequiredQualifications = response.jobRequiredQualifications;

				if (qualificationsEditor) {
					qualificationsEditor.innerHTML = markdownToHtml(jobRequiredQualifications);
				}

				await saveField('jobRequiredQualifications', jobRequiredQualifications);
			}
		} catch (error) {
			console.error('Failed to generate qualifications:', error);
			toast.error($t('requirementsV2.errors.failedToGenerateQualifications'));
		} finally {
			isGeneratingQualifications = false;
		}
	}

	// Toolbar handlers for description editor
	function descriptionBold() {
		toggleBold(descriptionEditor);
	}

	function descriptionItalic() {
		toggleItalic(descriptionEditor);
	}

	function descriptionHeading() {
		toggleHeading(descriptionEditor);
	}

	function descriptionUnorderedList() {
		insertUnorderedList(descriptionEditor);
	}

	function descriptionOrderedList() {
		insertOrderedList(descriptionEditor);
	}

	function descriptionLink() {
		insertLink(descriptionEditor);
	}

	function descriptionCode() {
		insertCode(descriptionEditor);
	}

	// Toolbar handlers for qualifications editor
	function qualificationsBold() {
		toggleBold(qualificationsEditor);
	}

	function qualificationsItalic() {
		toggleItalic(qualificationsEditor);
	}

	function qualificationsHeading() {
		toggleHeading(qualificationsEditor);
	}

	function qualificationsUnorderedList() {
		insertUnorderedList(qualificationsEditor);
	}

	function qualificationsOrderedList() {
		insertOrderedList(qualificationsEditor);
	}

	function qualificationsLink() {
		insertLink(qualificationsEditor);
	}

	function qualificationsCode() {
		insertCode(qualificationsEditor);
	}

	onMount(() => {
		if (descriptionEditor) {
			descriptionEditor.innerHTML = markdownToHtml(jobDescription);

			// Setup keyboard shortcuts for description editor
			cleanupDescriptionShortcuts = setupKeyboardShortcuts(descriptionEditor, {
				onBold: descriptionBold,
				onItalic: descriptionItalic
			});
		}

		if (qualificationsEditor) {
			qualificationsEditor.innerHTML = markdownToHtml(jobRequiredQualifications);

			// Setup keyboard shortcuts for qualifications editor
			cleanupQualificationsShortcuts = setupKeyboardShortcuts(qualificationsEditor, {
				onBold: qualificationsBold,
				onItalic: qualificationsItalic
			});
		}
	});

	onDestroy(() => {
		// Cleanup keyboard shortcuts
		if (cleanupDescriptionShortcuts) {
			cleanupDescriptionShortcuts();
		}
		if (cleanupQualificationsShortcuts) {
			cleanupQualificationsShortcuts();
		}
	});
</script>

<style>
	/* Markdown editor styles - using :global to ensure proper specificity */
	:global(.markdown-editor) {
		font-size: 16px;
		line-height: 1.6;
		color: #1f2937;
	}

	:global(.markdown-editor:focus) {
		outline: none;
	}

	:global(.markdown-editor h1) {
		font-size: 2em;
		font-weight: 700;
		line-height: 1.2;
		margin-top: 0.67em;
		margin-bottom: 0.67em;
		color: #111827;
	}

	:global(.markdown-editor h2) {
		font-size: 1.5em;
		font-weight: 600;
		line-height: 1.3;
		margin-top: 0.83em;
		margin-bottom: 0.83em;
		color: #111827;
	}

	:global(.markdown-editor h3) {
		font-size: 1.25em;
		font-weight: 600;
		line-height: 1.4;
		margin-top: 1em;
		margin-bottom: 1em;
		color: #111827;
	}

	:global(.markdown-editor ul) {
		list-style-type: disc;
		list-style-position: outside;
		margin-left: 1.5em;
		margin-top: 0.5em;
		margin-bottom: 0.5em;
		padding-left: 0.5em;
	}

	:global(.markdown-editor ol) {
		list-style-type: decimal;
		list-style-position: outside;
		margin-left: 1.5em;
		margin-top: 0.5em;
		margin-bottom: 0.5em;
		padding-left: 0.5em;
	}

	:global(.markdown-editor li) {
		display: list-item;
		margin-bottom: 0.25em;
		line-height: 1.6;
	}

	:global(.markdown-editor p) {
		margin-bottom: 0.75em;
		line-height: 1.6;
	}

	:global(.markdown-editor strong),
	:global(.markdown-editor b) {
		font-weight: 700;
	}

	:global(.markdown-editor em),
	:global(.markdown-editor i) {
		font-style: italic;
	}

	:global(.markdown-editor code) {
		background-color: #f3f4f6;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.875em;
		color: #dc2626;
	}

	:global(.markdown-editor a) {
		color: #2563eb;
		text-decoration: underline;
	}

	:global(.markdown-editor a:hover) {
		color: #1d4ed8;
	}

	/* Ensure empty elements are visible */
	:global(.markdown-editor p:empty:before),
	:global(.markdown-editor li:empty:before) {
		content: '\200B'; /* Zero-width space */
	}
</style>

<div class="w-full space-y-6">
	<!-- Info box -->
	<div class="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
		<Info class="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
		<div class="text-sm text-blue-900">
			<p class="font-medium">{$t('requirementsV2.aiGenerate.title')}</p>
			<p class="mt-1">
				{$t('requirementsV2.aiGenerate.description')}
			</p>
		</div>
	</div>

	<div>
		<h2 class="mb-2 text-2xl font-semibold">{$t('requirementsV2.steps.details.heading')}</h2>
		<p class="text-sm text-muted-foreground">
			{$t('requirementsV2.steps.details.subheading')}
		</p>
	</div>

	<!-- Job Description -->
	<div class="w-full space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-6">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<FileText class="h-5 w-5 text-primary" />
				<div>
					<Label class="text-base font-medium">
						{$t('requirementsV2.fields.jobDescription.label')}
						<span class="text-destructive">*</span>
					</Label>
					<p class="text-sm text-muted-foreground">
						{$t('requirementsV2.fields.jobDescription.description')}
					</p>
				</div>
			</div>
			<Button
				onclick={generateDescription}
				variant="outline"
				size="sm"
				disabled={isGeneratingDescription || !requirement.jobTitle}
				class="gap-2"
			>
				{#if isGeneratingDescription}
					<Loader2 class="h-4 w-4 animate-spin" />
					{$t('requirementsV2.aiGenerate.generating')}
				{:else}
					<Sparkles class="h-4 w-4" />
					{$t('requirementsV2.aiGenerate.button')}
				{/if}
			</Button>
		</div>

		<MarkdownToolbar
			onBold={descriptionBold}
			onItalic={descriptionItalic}
			onHeading={descriptionHeading}
			onUnorderedList={descriptionUnorderedList}
			onOrderedList={descriptionOrderedList}
			onLink={descriptionLink}
			onCode={descriptionCode}
		/>

		<div
			bind:this={descriptionEditor}
			contenteditable="true"
			onblur={handleDescriptionBlur}
			class="markdown-editor min-h-[300px] w-full max-w-none rounded-md border bg-white p-4 focus:outline-none focus:ring-2 focus:ring-primary"
		></div>

		{#if !requirement.jobTitle}
			<div class="flex gap-2 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
				<Info class="mt-0.5 h-4 w-4 flex-shrink-0" />
				<p>{$t('requirementsV2.aiGenerate.enableTip')}</p>
			</div>
		{/if}
	</div>

	<!-- Required Qualifications -->
	<div class="w-full space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-6">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<FileText class="h-5 w-5 text-primary" />
				<div>
					<Label class="text-base font-medium"
						>{$t('requirementsV2.fields.jobRequiredQualifications.label')}</Label
					>
					<p class="text-sm text-muted-foreground">
						{$t('requirementsV2.fields.jobRequiredQualifications.description')}
					</p>
				</div>
			</div>
			<Button
				onclick={generateQualifications}
				variant="outline"
				size="sm"
				disabled={isGeneratingQualifications || !requirement.jobTitle}
				class="gap-2"
			>
				{#if isGeneratingQualifications}
					<Loader2 class="h-4 w-4 animate-spin" />
					{$t('requirementsV2.aiGenerate.generating')}
				{:else}
					<Sparkles class="h-4 w-4" />
					{$t('requirementsV2.aiGenerate.button')}
				{/if}
			</Button>
		</div>

		<MarkdownToolbar
			onBold={qualificationsBold}
			onItalic={qualificationsItalic}
			onHeading={qualificationsHeading}
			onUnorderedList={qualificationsUnorderedList}
			onOrderedList={qualificationsOrderedList}
			onLink={qualificationsLink}
			onCode={qualificationsCode}
		/>

		<div
			bind:this={qualificationsEditor}
			contenteditable="true"
			onblur={handleQualificationsBlur}
			class="markdown-editor min-h-[250px] w-full max-w-none rounded-md border bg-white p-4 focus:outline-none focus:ring-2 focus:ring-primary"
		></div>

		{#if !requirement.jobTitle}
			<div class="flex gap-2 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
				<Info class="mt-0.5 h-4 w-4 flex-shrink-0" />
				<p>{$t('requirementsV2.aiGenerate.enableTip')}</p>
			</div>
		{/if}
	</div>
</div>
