<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { scrubinClient } from '@/scrubinClient/client';
	import type { JobRequirementDto } from '@/scrubinClient';
	import { toast } from 'svelte-sonner';
	import { Sparkles, FileText, Info, Loader2 } from 'lucide-svelte';

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

	// Local state for form fields
	let jobDescription = $state(requirement.jobDescription || '');
	let jobRequiredQualifications = $state(requirement.jobRequiredQualifications || '');

	async function saveField(field: string, value: any) {
		if (!requirementId) return;

		isSaving = true;
		try {
			const updateData: any = {};
			updateData[field] = value;

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

	function handleDescriptionBlur() {
		if (jobDescription !== requirement.jobDescription) {
			saveField('jobDescription', jobDescription);
		}
	}

	function handleQualificationsBlur() {
		if (jobRequiredQualifications !== requirement.jobRequiredQualifications) {
			saveField('jobRequiredQualifications', jobRequiredQualifications);
		}
	}

	async function generateDescription() {
		isGeneratingDescription = true;
		try {
			// Use the chat API to generate content
			const prompt = `Generate a professional job description for a ${requirement.jobTitle || 'position'} role.
				${requirement.professionsV2?.length ? `Professions: ${requirement.professionsV2.join(', ')}. ` : ''}
				${requirement.country ? `Location: ${requirement.country}. ` : ''}
				Make it compelling and detailed, including responsibilities, what the role entails, and what makes it attractive.`;

			const response = await scrubinClient.hunt.requirementsChat({
				message: prompt,
				chatSessionId: undefined
			});

			// Extract generated content from the chat messages
			const lastMessage = response.chatMessages.items[response.chatMessages.items.length - 1];
			if (lastMessage && lastMessage.message) {
				jobDescription = lastMessage.message;
				await saveField('jobDescription', jobDescription);
			}
		} catch (error) {
			console.error('Failed to generate description:', error);
			toast.error('Failed to generate description. Please try again or write manually.');
		} finally {
			isGeneratingDescription = false;
		}
	}

	async function generateQualifications() {
		isGeneratingQualifications = true;
		try {
			const prompt = `Generate a list of required qualifications and skills for a ${requirement.jobTitle || 'position'} role.
				${requirement.professionsV2?.length ? `Professions: ${requirement.professionsV2.join(', ')}. ` : ''}
				${requirement.jobRequiredWorkExperience ? `Required experience: ${requirement.jobRequiredWorkExperience} years. ` : ''}
				${requirement.jobRequiredLanguages?.length ? `Languages: ${requirement.jobRequiredLanguages.join(', ')}. ` : ''}
				Format as a clear bullet-point list of must-have qualifications.`;

			const response = await scrubinClient.hunt.requirementsChat({
				message: prompt,
				chatSessionId: undefined
			});

			const lastMessage = response.chatMessages.items[response.chatMessages.items.length - 1];
			if (lastMessage && lastMessage.message) {
				jobRequiredQualifications = lastMessage.message;
				await saveField('jobRequiredQualifications', jobRequiredQualifications);
			}
		} catch (error) {
			console.error('Failed to generate qualifications:', error);
			toast.error('Failed to generate qualifications. Please try again or write manually.');
		} finally {
			isGeneratingQualifications = false;
		}
	}
</script>

<div class="space-y-8">
	<div>
		<h2 class="mb-2 text-2xl font-semibold">Job Details</h2>
		<p class="text-sm text-muted-foreground">
			Provide detailed information about the role to attract the right candidates.
		</p>
	</div>

	<!-- Job Description -->
	<div class="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-6">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<FileText class="h-5 w-5 text-primary" />
				<div>
					<Label class="text-base font-medium">
						Job Description <span class="text-destructive">*</span>
					</Label>
					<p class="text-sm text-muted-foreground">
						Describe the role, responsibilities, and what makes this opportunity exciting.
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
					Generating...
				{:else}
					<Sparkles class="h-4 w-4" />
					AI Generate
				{/if}
			</Button>
		</div>

		<textarea
			bind:value={jobDescription}
			onblur={handleDescriptionBlur}
			placeholder="Describe the job role, main responsibilities, day-to-day tasks, team structure, growth opportunities, and what makes this role unique. Be detailed and engaging to attract top talent.

Example:
We're seeking a talented Senior Software Engineer to join our growing engineering team. You'll be working on cutting-edge projects that impact millions of users...

Key Responsibilities:
• Design and implement scalable backend services
• Collaborate with cross-functional teams
• Mentor junior developers
..."
			class="min-h-[300px] w-full rounded-md border bg-white p-4 text-base focus:outline-none focus:ring-2 focus:ring-primary"
			rows="12"
		></textarea>

		{#if !requirement.jobTitle}
			<div class="flex gap-2 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
				<Info class="mt-0.5 h-4 w-4 flex-shrink-0" />
				<p>Add a job title in the first step to enable AI generation</p>
			</div>
		{/if}
	</div>

	<!-- Required Qualifications -->
	<div class="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-6">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<FileText class="h-5 w-5 text-primary" />
				<div>
					<Label class="text-base font-medium">Required Qualifications</Label>
					<p class="text-sm text-muted-foreground">
						List the must-have skills, experience, and qualifications for this role.
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
					Generating...
				{:else}
					<Sparkles class="h-4 w-4" />
					AI Generate
				{/if}
			</Button>
		</div>

		<textarea
			bind:value={jobRequiredQualifications}
			onblur={handleQualificationsBlur}
			placeholder="List the essential qualifications, certifications, skills, and experience candidates must have. Be specific but realistic.

Example:
• Bachelor's degree in Computer Science or related field
• 5+ years of professional software development experience
• Strong proficiency in Python and JavaScript
• Experience with cloud platforms (AWS, GCP, or Azure)
• Excellent problem-solving and communication skills
• Experience leading technical projects and mentoring others
..."
			class="min-h-[250px] w-full rounded-md border bg-white p-4 text-base focus:outline-none focus:ring-2 focus:ring-primary"
			rows="10"
		></textarea>

		{#if !requirement.jobTitle}
			<div class="flex gap-2 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
				<Info class="mt-0.5 h-4 w-4 flex-shrink-0" />
				<p>Add a job title in the first step to enable AI generation</p>
			</div>
		{/if}
	</div>

	<!-- Info box -->
	<div class="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
		<Info class="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
		<div class="text-sm text-blue-900">
			<p class="font-medium">AI assistance available!</p>
			<p class="mt-1">
				Click the "AI Generate" buttons to automatically create professional descriptions and
				qualifications based on the information you've provided. You can always edit the generated
				content to fit your needs.
			</p>
		</div>
	</div>
</div>
