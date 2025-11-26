<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { MessageCircle, Check, Clock } from 'lucide-svelte';
	import type { ContextQuestion } from '$lib/scrubinClient';
	import { scrubinClient } from '$lib/scrubinClient/client';
	import { onMount, tick } from 'svelte';
	import { t } from '$lib/i18n';

	interface QuestionsInHuntProps {
		huntId: number;
		onUnansweredChange?: (count: number) => void;
	}

	const { huntId, onUnansweredChange = () => {} } = $props<QuestionsInHuntProps>();

	let questions = $state<ContextQuestion[]>([]);
	let isLoading = $state(true);
	let answer = $state('');
	let editingQuestionId = $state<number | null>(null);

	onMount(async () => {
		await loadQuestions();
	});

	async function loadQuestions() {
		try {
			questions = await scrubinClient.hunt.getHuntContextQuestions(huntId);
		} catch (error) {
			console.error('Failed to load questions:', error);
		} finally {
			isLoading = false;
			updateUnansweredCount();
		}
	}

	async function submitAnswer(questionId: number) {
		if (!answer.trim()) return;

		try {
			const updatedQuestion = await scrubinClient.hunt.answerHuntContextQuestion(
				huntId,
				questionId,
				answer
			);

			// Update the questions list with the new answer
			questions = questions.map((q) => (q.id === questionId ? updatedQuestion : q));

			// Reset the form
			answer = '';
			editingQuestionId = null;
			updateUnansweredCount();
		} catch (error) {
			console.error('Failed to submit answer:', error);
		}
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	let inputRef = $state<HTMLInputElement | null>(null);
	async function answerQuestion(questionId: number) {
		editingQuestionId = questionId;
		await tick();
		console.log(inputRef);
		inputRef?.focus();
	}

	function updateUnansweredCount() {
		const count = questions.filter((q) => !q.answer || q.answer.trim().length === 0).length;
		onUnansweredChange(count);
	}
</script>

<div class="space-y-4">
	{#if isLoading}
		<div class="flex items-center justify-center py-8">
			<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
		</div>
	{:else if questions.length === 0}
		<Card.Root>
			<Card.Content class="pt-6">
				<div class="flex flex-col items-center gap-2 py-8 text-center">
					<MessageCircle class="h-12 w-12 text-muted-foreground/50" />
					<h3 class="text-lg font-semibold">{$t('dashboard.questionsInHunt.noQuestions')}</h3>
					<p class="text-sm text-muted-foreground">
						{$t('dashboard.questionsInHunt.noQuestionsDesc')}
					</p>
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="grid gap-4">
			{#each questions as question (question.id)}
				<Card.Root>
					<Card.Content class="pt-6">
						<div class="space-y-4">
							<div class="flex items-start justify-between gap-4">
								<div class="space-y-1">
									<div class="flex items-center gap-2">
										<MessageCircle class="h-4 w-4 text-muted-foreground" />
										<h4 class="text-sm font-medium">{$t('dashboard.questionsInHunt.question')}</h4>
									</div>
									<p class="text-sm text-gray-600">{question.question}</p>
								</div>
								<span class="whitespace-nowrap text-xs text-muted-foreground">
									{formatDate(question.date)}
								</span>
							</div>

							{#if question.answer}
								<div class="space-y-1 border-l pl-6">
									<div class="flex items-center gap-2">
										<Check class="h-4 w-4 text-green-600" />
										<h4 class="text-sm font-medium text-green-600">
											{$t('dashboard.questionsInHunt.answer')}
										</h4>
									</div>
									<p class="text-sm text-gray-600">{question.answer}</p>
								</div>
							{:else if editingQuestionId === question.id}
								<div class="space-y-2 border-l pl-6">
									<div class="flex items-center gap-2">
										<Clock class="h-4 w-4 text-orange-600" />
										<h4 class="text-sm font-medium text-orange-600">
											{$t('dashboard.questionsInHunt.pendingAnswer')}
										</h4>
									</div>
									<div class="flex gap-2">
										<Input
											bind:ref={inputRef}
											bind:value={answer}
											placeholder={$t('dashboard.questionsInHunt.answerPlaceholder')}
											class="flex-1"
										/>
										<Button onclick={() => submitAnswer(question.id)}>
											{$t('dashboard.questionsInHunt.submit')}
										</Button>
										<Button
											variant="outline"
											onclick={() => {
												editingQuestionId = null;
												answer = '';
											}}
										>
											{$t('dashboard.questionsInHunt.cancel')}
										</Button>
									</div>
								</div>
							{:else}
								<div class="border-l pl-6">
									<div class="mb-2 flex items-center gap-2">
										<Clock class="h-4 w-4 text-orange-600" />
										<h4 class="text-sm font-medium text-orange-600">
											{$t('dashboard.questionsInHunt.pendingAnswer')}
										</h4>
									</div>
									<Button
										variant="outline"
										class="w-full"
										onclick={() => answerQuestion(question.id)}
									>
										{$t('dashboard.questionsInHunt.addAnswer')}
									</Button>
								</div>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>
