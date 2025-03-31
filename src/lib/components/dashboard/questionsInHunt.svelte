<script lang="ts">
    import * as Card from "$lib/components/ui/card";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { MessageCircle, Check, Clock } from "lucide-svelte";
    import type { ContextQuestion } from "$lib/scrubinClient";
    import { scrubinClient } from "$lib/scrubinClient/client";
    import { onMount, tick } from "svelte";

    const { huntId } = $props();

    let questions = $state<ContextQuestion[]>([]);
    let isLoading = $state(true);
    let answer = $state("");
    let editingQuestionId = $state<number | null>(null);

    onMount(async () => {
        await loadQuestions();
    });

    async function loadQuestions() {
        try {
            questions = await scrubinClient.hunt.getHuntContextQuestions(huntId);
        } catch (error) {
            console.error("Failed to load questions:", error);
        } finally {
            isLoading = false;
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
            questions = questions.map(q => 
                q.id === questionId ? updatedQuestion : q
            );
            
            // Reset the form
            answer = "";
            editingQuestionId = null;
        } catch (error) {
            console.error("Failed to submit answer:", error);
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
        await tick()
        console.log(inputRef);
        inputRef?.focus();
    }
</script>

<div class="space-y-4">
    {#if isLoading}
        <div class="flex justify-center items-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    {:else if questions.length === 0}
        <Card.Root>
            <Card.Content class="pt-6">
                <div class="flex flex-col items-center text-center gap-2 py-8">
                    <MessageCircle class="h-12 w-12 text-muted-foreground/50" />
                    <h3 class="font-semibold text-lg">No Questions Yet</h3>
                    <p class="text-muted-foreground text-sm">
                        Questions from candidates will appear here. These help build context for future interactions.
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
                                        <h4 class="font-medium text-sm">Question</h4>
                                    </div>
                                    <p class="text-sm text-gray-600">{question.question}</p>
                                </div>
                                <span class="text-xs text-muted-foreground whitespace-nowrap">
                                    {formatDate(question.date)}
                                </span>
                            </div>

                            {#if question.answer}
                                <div class="pl-6 border-l space-y-1">
                                    <div class="flex items-center gap-2">
                                        <Check class="h-4 w-4 text-green-600" />
                                        <h4 class="font-medium text-sm text-green-600">Answer</h4>
                                    </div>
                                    <p class="text-sm text-gray-600">{question.answer}</p>
                                </div>
                            {:else if editingQuestionId === question.id}
                                <div class="pl-6 border-l space-y-2">
                                    <div class="flex items-center gap-2">
                                        <Clock class="h-4 w-4 text-orange-600" />
                                        <h4 class="font-medium text-sm text-orange-600">Pending Answer</h4>
                                    </div>
                                    <div class="flex gap-2">
                                        <Input
                                            bind:ref={inputRef}
                                            bind:value={answer}
                                            placeholder="Type your answer..."
                                            class="flex-1"
                                        />
                                        <Button onclick={() => submitAnswer(question.id)}>
                                            Submit
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            onclick={() => {
                                                editingQuestionId = null;
                                                answer = "";
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            {:else}
                                <div class="pl-6 border-l">
                                    <div class="flex items-center gap-2 mb-2">
                                        <Clock class="h-4 w-4 text-orange-600" />
                                        <h4 class="font-medium text-sm text-orange-600">Pending Answer</h4>
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        class="w-full" 
                                        onclick={() => answerQuestion(question.id)}
                                    >
                                        Add Answer
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
