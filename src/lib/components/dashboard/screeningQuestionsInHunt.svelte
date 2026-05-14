<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { ListChecks, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-svelte';
	import type {
		HuntScreeningQuestion,
		HuntScreeningQuestionInput,
		HuntScreeningQuestionTopic
	} from '$lib/scrubinClient';
	import { scrubinClient } from '$lib/scrubinClient/client';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { t } from '$lib/i18n';

	interface Props {
		huntId: number;
	}

	const { huntId }: Props = $props();

	type DraftQuestion = HuntScreeningQuestionInput & { _key: string };

	let drafts = $state<DraftQuestion[]>([]);
	let isLoading = $state(true);
	let isSaving = $state(false);
	let nextKey = 0;

	const TOPIC_OPTIONS: { value: HuntScreeningQuestionTopic; labelKey: string }[] = [
		{ value: 'documents', labelKey: 'dashboard.screeningQuestions.topic.documents' },
		{ value: 'motivation', labelKey: 'dashboard.screeningQuestions.topic.motivation' },
		{ value: 'destination', labelKey: 'dashboard.screeningQuestions.topic.destination' },
		{ value: 'on_trip_meeting', labelKey: 'dashboard.screeningQuestions.topic.on_trip_meeting' },
		{ value: 'custom', labelKey: 'dashboard.screeningQuestions.topic.custom' }
	];

	const TEMPLATES: { topic: HuntScreeningQuestionTopic; questionKey: string }[] = [
		{
			topic: 'documents',
			questionKey: 'dashboard.screeningQuestions.template.documents'
		},
		{
			topic: 'motivation',
			questionKey: 'dashboard.screeningQuestions.template.motivation'
		},
		{
			topic: 'destination',
			questionKey: 'dashboard.screeningQuestions.template.destination'
		},
		{
			topic: 'on_trip_meeting',
			questionKey: 'dashboard.screeningQuestions.template.on_trip_meeting'
		}
	];

	function toDraft(q: HuntScreeningQuestion): DraftQuestion {
		return {
			_key: `existing-${q.id}`,
			id: q.id,
			question: q.question,
			rationale: q.rationale,
			expectedTopic: q.expectedTopic,
			required: q.required,
			displayOrder: q.displayOrder
		};
	}

	onMount(async () => {
		try {
			const rows = await scrubinClient.hunt.getScreeningQuestions(huntId);
			drafts = rows.map(toDraft);
		} catch (error) {
			console.error('Failed to load screening questions', error);
			toast.error($t('dashboard.screeningQuestions.loadFailed'));
		} finally {
			isLoading = false;
		}
	});

	function addRow(template?: { topic: HuntScreeningQuestionTopic; questionKey: string }) {
		nextKey += 1;
		drafts = [
			...drafts,
			{
				_key: `new-${nextKey}`,
				question: template ? $t(template.questionKey as any) : '',
				rationale: '',
				expectedTopic: template?.topic ?? 'custom',
				required: true,
				displayOrder: drafts.length
			}
		];
	}

	function removeRow(key: string) {
		drafts = drafts.filter((d) => d._key !== key);
	}

	function moveRow(key: string, delta: number) {
		const idx = drafts.findIndex((d) => d._key === key);
		const target = idx + delta;
		if (idx < 0 || target < 0 || target >= drafts.length) return;
		const next = drafts.slice();
		const [moved] = next.splice(idx, 1);
		next.splice(target, 0, moved);
		drafts = next.map((d, i) => ({ ...d, displayOrder: i }));
	}

	async function save() {
		const cleaned = drafts
			.map((d, i) => ({
				id: d.id,
				question: (d.question ?? '').trim(),
				rationale: d.rationale ? d.rationale.trim() : null,
				expectedTopic: d.expectedTopic ?? null,
				required: !!d.required,
				displayOrder: i
			}))
			.filter((d) => d.question.length > 0);

		isSaving = true;
		try {
			const updated = await scrubinClient.hunt.replaceScreeningQuestions(huntId, cleaned);
			drafts = updated.map(toDraft);
			toast.success($t('dashboard.screeningQuestions.saved'));
		} catch (error) {
			console.error('Failed to save screening questions', error);
			toast.error($t('dashboard.screeningQuestions.saveFailed'));
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="space-y-4">
	<div class="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
		<p class="font-medium">{$t('dashboard.screeningQuestions.intro.title')}</p>
		<p class="mt-1 text-blue-800">{$t('dashboard.screeningQuestions.intro.body')}</p>
	</div>

	{#if isLoading}
		<div class="flex items-center justify-center py-8">
			<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
		</div>
	{:else}
		{#if drafts.length === 0}
			<Card.Root>
				<Card.Content class="pt-6">
					<div class="flex flex-col items-center gap-2 py-8 text-center">
						<ListChecks class="h-12 w-12 text-muted-foreground/50" />
						<h3 class="text-lg font-semibold">{$t('dashboard.screeningQuestions.empty.title')}</h3>
						<p class="text-sm text-muted-foreground">
							{$t('dashboard.screeningQuestions.empty.body')}
						</p>
					</div>
				</Card.Content>
			</Card.Root>
		{:else}
			<div class="grid gap-4">
				{#each drafts as draft, idx (draft._key)}
					<Card.Root>
						<Card.Content class="pt-6">
							<div class="space-y-3">
								<div class="flex items-center justify-between gap-2">
									<span class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
										#{idx + 1}
									</span>
									<div class="flex items-center gap-1">
										<Button
											variant="ghost"
											size="icon"
											onclick={() => moveRow(draft._key, -1)}
											disabled={idx === 0}
											aria-label="Move up"
										>
											<ArrowUp class="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											onclick={() => moveRow(draft._key, 1)}
											disabled={idx === drafts.length - 1}
											aria-label="Move down"
										>
											<ArrowDown class="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											onclick={() => removeRow(draft._key)}
											aria-label={$t('dashboard.screeningQuestions.delete')}
										>
											<Trash2 class="h-4 w-4 text-red-500" />
										</Button>
									</div>
								</div>

								<div>
									<Label class="text-xs">
										{$t('dashboard.screeningQuestions.fields.question')}
									</Label>
									<Textarea
										bind:value={draft.question}
										placeholder={$t('dashboard.screeningQuestions.fields.questionPlaceholder')}
										rows={2}
										class="mt-1"
									/>
								</div>

								<div>
									<Label class="text-xs">
										{$t('dashboard.screeningQuestions.fields.rationale')}
									</Label>
									<Textarea
										value={draft.rationale ?? ''}
										oninput={(e) =>
											(draft.rationale = (e.currentTarget as HTMLTextAreaElement).value)}
										placeholder={$t('dashboard.screeningQuestions.fields.rationalePlaceholder')}
										rows={2}
										class="mt-1"
									/>
								</div>

								<div class="flex flex-wrap items-center gap-4">
									<div class="flex flex-1 items-center gap-2">
										<Label class="text-xs">
											{$t('dashboard.screeningQuestions.fields.topic')}
										</Label>
										<Select.Root
											type="single"
											value={draft.expectedTopic ?? 'custom'}
											onValueChange={(v) =>
												(draft.expectedTopic = (v ?? 'custom') as HuntScreeningQuestionTopic)}
										>
											<Select.Trigger class="w-48">
												{$t(
													(TOPIC_OPTIONS.find((o) => o.value === (draft.expectedTopic ?? 'custom'))
														?.labelKey ?? 'dashboard.screeningQuestions.topic.custom') as any
												)}
											</Select.Trigger>
											<Select.Content>
												{#each TOPIC_OPTIONS as opt}
													<Select.Item value={opt.value}>{$t(opt.labelKey as any)}</Select.Item>
												{/each}
											</Select.Content>
										</Select.Root>
									</div>

									<label class="flex items-center gap-2 text-sm">
										<Checkbox bind:checked={draft.required} />
										<span>{$t('dashboard.screeningQuestions.fields.required')}</span>
									</label>
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{/if}

		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex flex-wrap items-center gap-2">
				<Button variant="outline" onclick={() => addRow()}>
					<Plus class="mr-1 h-4 w-4" />
					{$t('dashboard.screeningQuestions.addBlank')}
				</Button>
				{#each TEMPLATES as tpl}
					<Button variant="outline" size="sm" onclick={() => addRow(tpl)}>
						{$t(tpl.questionKey as any)}
					</Button>
				{/each}
			</div>
			<Button onclick={save} disabled={isSaving}>
				{#if isSaving}
					<div class="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
				{/if}
				{$t('dashboard.screeningQuestions.save')}
			</Button>
		</div>
	{/if}
</div>
