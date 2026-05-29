<script lang="ts">
	import { page } from '$app/state';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { t } from '$lib/i18n';
	import type { PublicShareView } from '$lib/scrubinClient';
	import { scrubinClient } from '$lib/scrubinClient/client';
	import { onMount } from 'svelte';

	let data = $state<PublicShareView | null>(null);
	let loading = $state(true);
	let expired = $state(false);

	onMount(async () => {
		const token = page.params.token;
		try {
			data = await scrubinClient.publicShare.open(token);
		} catch {
			expired = true;
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Scrubin · Shared</title>
</svelte:head>

<div class="min-h-screen bg-muted/30 p-6">
	{#if loading}
		<p class="text-sm text-muted-foreground">{$t('publicShare.loadingTitle')}</p>
	{:else if expired || !data}
		<Card.Root class="max-w-md mx-auto">
			<Card.Header>
				<Card.Title>{$t('publicShare.expiredTitle')}</Card.Title>
			</Card.Header>
			<Card.Content>
				<p class="text-sm text-muted-foreground">{$t('publicShare.expiredBody')}</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="max-w-3xl mx-auto space-y-4">
			<div class="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900">
				{$t('publicShare.viewOnlyBanner', { brand: data.hunt.companyBrandName ?? '' })}
			</div>

			<Card.Root>
				<Card.Header>
					<Card.Title>{data.hunt.jobTitle ?? `Hunt #${data.hunt.huntId}`}</Card.Title>
					{#if data.hunt.country}
						<Card.Description>{data.hunt.country}</Card.Description>
					{/if}
				</Card.Header>
			</Card.Root>

			{#if data.candidates && data.candidates.length > 0}
				<Card.Root>
					<Card.Content class="p-0">
						<ul class="divide-y">
							{#each data.candidates as c (c.candidateId)}
								<li class="flex items-center justify-between px-4 py-3">
									<div>
										<div class="text-sm font-medium">
											{[c.firstName, c.lastName].filter(Boolean).join(' ') || 'Anonymous candidate'}
										</div>
										<div class="text-xs text-muted-foreground">
											{c.countryIso ?? ''}
											{c.profession ? ` · ${c.profession}` : ''}
										</div>
									</div>
									{#if c.status}
										<Badge variant="secondary">{c.status}</Badge>
									{/if}
								</li>
							{/each}
						</ul>
					</Card.Content>
				</Card.Root>
			{/if}
		</div>
	{/if}
</div>
