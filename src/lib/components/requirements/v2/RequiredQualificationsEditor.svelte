<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Plus, Sparkles, Trash2, Loader2 } from 'lucide-svelte';
	import type { HuntRequiredQualification, JobRequirementDto } from '$lib/scrubinClient';
	import { scrubinClient } from '$lib/scrubinClient/client';
	import { toast } from 'svelte-sonner';
	import { t } from '$lib/i18n';
	import { onDestroy, onMount } from 'svelte';

	type Row = HuntRequiredQualification & { _key: string };

	let {
		requirement = $bindable<JobRequirementDto>(),
		requirementId
	}: {
		requirement: JobRequirementDto & { requiredQualifications?: HuntRequiredQualification[] };
		requirementId: number;
	} = $props();

	let nextKey = 0;
	let rows = $state<Row[]>(
		(requirement.requiredQualifications ?? []).map((q, i) => ({
			_key: `existing-${i}-${q.code}`,
			...q
		}))
	);
	let isSaving = $state(false);
	let isSuggesting = $state(false);
	let didInitialSuggest = $state(false);

	// Debounced auto-save plumbing — matches the onblur auto-save model used by
	// every other step in the wizard.
	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	let isInitialEffect = true;
	// Set when we mutate rows ourselves after a successful save, so the
	// resulting $effect re-run doesn't trigger another save (would loop).
	let suppressNextEffect = false;

	function syncFromRequirement() {
		const incoming = requirement.requiredQualifications ?? [];
		suppressNextEffect = true;
		rows = incoming.map((q, i) => ({ _key: `existing-${i}-${q.code}`, ...q }));
	}

	function scheduleSave() {
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => {
			saveTimer = null;
			void save({ silent: true });
		}, 700);
	}
	/**
	 * Ask the backend's AI service for suggested hard-required qualifications.
	 * `silent` skips toasts on the empty/already-added paths — used for the
	 * first-open auto-trigger so the company doesn't see a noisy "no codes
	 * detected" toast when they open the step.
	 */
	async function suggestFromAI(opts: { silent?: boolean } = {}) {
		if (isSuggesting) return;
		isSuggesting = true;
		try {
			const result = await scrubinClient.hunt.suggestRequiredQualifications(requirementId);
			const suggestions = result.qualifications ?? [];

			const existingCodes = new Set(rows.map((r) => r.code.trim().toUpperCase()));
			const additions = suggestions.filter((s) => !existingCodes.has(s.code.toUpperCase()));

			if (suggestions.length === 0) {
				if (!opts.silent) {
					toast.info($t('requirementsV2.fields.requiredQualifications.autoDetectNoneFound'));
				}
				return;
			}
			if (additions.length === 0) {
				if (!opts.silent) {
					toast.info($t('requirementsV2.fields.requiredQualifications.autoDetectAllAlreadyAdded'));
				}
				return;
			}

			const newRows: Row[] = additions.map((a) => {
				nextKey += 1;
				return {
					_key: `new-${nextKey}`,
					code: a.code,
					label: a.label,
					rationale: a.rationale,
					blockOffer: a.blockOffer ?? true
				};
			});
			rows = [...rows, ...newRows];
			toast.success(
				$t('requirementsV2.fields.requiredQualifications.autoDetectAdded', {
					count: String(additions.length)
				})
			);
		} catch (error) {
			console.error('Failed to suggest required qualifications', error);
			if (!opts.silent) {
				toast.error($t('requirementsV2.fields.requiredQualifications.autoDetectFailed'));
			}
		} finally {
			isSuggesting = false;
		}
	}

	function addRow(preset?: { code: string; label: string }) {
		nextKey += 1;
		rows = [
			...rows,
			{
				_key: `new-${nextKey}`,
				code: preset?.code ?? '',
				label: preset?.label ?? '',
				rationale: '',
				blockOffer: true
			}
		];
	}

	function removeRow(key: string) {
		rows = rows.filter((r) => r._key !== key);
	}

	/**
	 * Derive an internal stable code from the human label when the row didn't
	 * already have one. Codes are never shown to the company user — they're
	 * the key the chat agent uses to record yes/no answers and the handoff
	 * gate uses to look those answers up.
	 */
	function slugifyLabel(label: string): string {
		return label
			.trim()
			.toUpperCase()
			.replace(/[^A-Z0-9]+/g, '_')
			.replace(/^_+|_+$/g, '')
			.slice(0, 64);
	}

	async function save(opts: { silent?: boolean } = {}) {
		const cleaned: HuntRequiredQualification[] = rows
			.map((r) => {
				const label = r.label.trim();
				const existingCode = r.code.trim();
				// Stable existing codes (from AI suggestion or prior save) survive
				// re-saves untouched, so candidate answers keyed on them keep
				// matching. New rows get a code derived from the label.
				const code = existingCode.length > 0 ? existingCode : slugifyLabel(label);
				return {
					code,
					label,
					rationale: r.rationale?.trim() ?? '',
					blockOffer: !!r.blockOffer
				};
			})
			.filter((r) => r.code.length > 0 && r.label.length > 0);

		// Collision check on the derived/stored codes — usually surfaces when
		// two rows share a near-identical label.
		const codes = new Set<string>();
		for (const r of cleaned) {
			if (codes.has(r.code)) {
				toast.error($t('requirementsV2.fields.requiredQualifications.errors.duplicateCode'));
				return;
			}
			codes.add(r.code);
		}

		isSaving = true;
		try {
			const updated = await scrubinClient.hunt.updateRequirementFields(requirementId, {
				requiredQualifications: cleaned
			});
			requirement = { ...requirement, ...updated } as unknown as JobRequirementDto;
			syncFromRequirement();
			if (!opts.silent) {
				toast.success($t('requirementsV2.success.saved'));
			}
		} catch (error) {
			console.error('Failed to save required qualifications', error);
			toast.error($t('requirementsV2.errors.failedToSave'));
		} finally {
			isSaving = false;
		}
	}

	$effect(() => {
		// Touch every reactive field on every row so this re-runs on any edit
		// (add/remove/label/rationale/blockOffer). Svelte 5 $state proxies make
		// the deep read enough to register the dependency.
		rows.map((r) => `${r.label}|${r.code}|${r.rationale ?? ''}|${r.blockOffer}`);

		if (isInitialEffect) {
			isInitialEffect = false;
			return;
		}
		if (suppressNextEffect) {
			suppressNextEffect = false;
			return;
		}
		scheduleSave();
	});

	onMount(() => {
		// First-open auto-suggest: when the qualifications step is opened for the
		// first time AND the company hasn't authored any yet, ask the AI for
		// suggestions in the background. The company reviews + saves.
		if (rows.length === 0 && !didInitialSuggest) {
			didInitialSuggest = true;
			void suggestFromAI({ silent: true });
		}
	});

	onDestroy(() => {
		if (saveTimer) clearTimeout(saveTimer);
	});
</script>

<div class="w-full space-y-3">
	{#if rows.length === 0}
		<div
			class="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground"
		>
			{#if isSuggesting}
				<div class="flex items-center justify-center gap-2">
					<Loader2 class="h-4 w-4 animate-spin" />
					<span>{$t('requirementsV2.fields.requiredQualifications.autoDetecting')}</span>
				</div>
			{:else}
				{$t('requirementsV2.fields.requiredQualifications.empty')}
			{/if}
		</div>
	{:else}
		<div class="space-y-3">
			{#each rows as row (row._key)}
				<div class="space-y-2 rounded-md border bg-white p-4">
					<div class="flex flex-wrap items-end gap-3">
						<div class="flex flex-1 flex-col">
							<Label class="text-xs">
								{$t('requirementsV2.fields.requiredQualifications.fields.label')}
							</Label>
							<Input
								bind:value={row.label}
								placeholder={$t(
									'requirementsV2.fields.requiredQualifications.fields.labelPlaceholder'
								)}
								class="mt-1"
							/>
						</div>
						<label class="flex h-10 items-center gap-2 self-end text-sm">
							<Checkbox bind:checked={row.blockOffer} />
							<span>{$t('requirementsV2.fields.requiredQualifications.fields.blockOffer')}</span>
						</label>
						<Button
							variant="ghost"
							size="icon"
							onclick={() => removeRow(row._key)}
							aria-label={$t('requirementsV2.fields.requiredQualifications.fields.delete')}
						>
							<Trash2 class="h-4 w-4 text-red-500" />
						</Button>
					</div>
					<div>
						<Label class="text-xs">
							{$t('requirementsV2.fields.requiredQualifications.fields.rationale')}
						</Label>
						<Textarea
							value={row.rationale ?? ''}
							oninput={(e) => (row.rationale = (e.currentTarget as HTMLTextAreaElement).value)}
							placeholder={$t(
								'requirementsV2.fields.requiredQualifications.fields.rationalePlaceholder'
							)}
							rows={2}
							class="mt-1"
						/>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<div class="flex flex-wrap items-center gap-2">
		<Button variant="secondary" size="sm" onclick={() => suggestFromAI()} disabled={isSuggesting}>
			{#if isSuggesting}
				<Loader2 class="mr-1 h-4 w-4 animate-spin" />
			{:else}
				<Sparkles class="mr-1 h-4 w-4" />
			{/if}
			{$t('requirementsV2.fields.requiredQualifications.autoDetect')}
		</Button>
		<Button variant="outline" size="sm" onclick={() => addRow()}>
			<Plus class="mr-1 h-4 w-4" />
			{$t('requirementsV2.fields.requiredQualifications.addBlank')}
		</Button>
		{#if isSaving}
			<span class="ml-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
				<Loader2 class="h-3 w-3 animate-spin" />
				{$t('requirementsV2.fields.requiredQualifications.saving')}
			</span>
		{/if}
	</div>
</div>
