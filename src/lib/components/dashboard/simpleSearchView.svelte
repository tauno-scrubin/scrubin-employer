<script lang="ts">
	import { goto } from '$app/navigation';
	import { visible } from './overlay';
	import { scrubinClient, currentUser } from '@/scrubinClient/client';
	import { toast } from 'svelte-sonner';
	import { slide } from 'svelte/transition';
	import Textarea from '../ui/textarea/textarea.svelte';
	import Button from '../ui/button/button.svelte';
	import { Loader2, Sparkle } from 'lucide-svelte';
	import { t } from '$lib/i18n';

	let searchText: string = $state('');
	let isLoading: boolean = $state(false);
	let inputFocused: boolean = $state(false);

	const submitSearch = async (event: SubmitEvent) => {
		event.preventDefault();
		searchRequirements(searchText);
	};

	export async function searchRequirements(inputText?: string) {
		const textToSearch = inputText || searchText;
		if (!textToSearch.trim()) return;

		visible.set(true);
		isLoading = true;

		try {
			if (inputText) {
				searchText = inputText;
			}

			const result = await scrubinClient.hunt.requirementsChat({
				message: textToSearch
			});

			// Redirect to the requirements page with the job requirement ID
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
				<Textarea
					bind:value={searchText}
					maxlength={5000}
					onfocus={() => (inputFocused = true)}
					onblur={() => !searchText && (inputFocused = false)}
					placeholder={$t('dashboard.searchView.searchPlaceholder')}
					class="flex-1 resize-none border-0 bg-transparent p-0 px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
				/>

				{#if inputFocused}
					<div
						transition:slide={{ delay: 100, duration: 200 }}
						class="flex w-full items-end justify-between gap-2"
					>
						<span class="text-xs text-gray-400">{searchText.length}/5000</span>
						<div class="flex items-center gap-2">
							<Button
								type="submit"
								variant="default"
								class="h-10 w-10 rounded-full bg-blue-600 p-0 transition-all duration-200 hover:bg-blue-700"
							>
								{#if isLoading}
									<Loader2 class="h-5 w-5 animate-spin" />
								{:else}
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
								{/if}
							</Button>
						</div>
					</div>
				{/if}
			</form>
		</div>
	</div>
</div>
