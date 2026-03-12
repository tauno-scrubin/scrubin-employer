<script lang="ts">
	import { locale, t } from '$lib/i18n';
	import AppSidebar from '@/components/app-sidebar.svelte';
	import AnalyzingOverlay from '@/components/dashboard/analyzingOverlay.svelte';
	import { Button } from '@/components/ui/button';
	import * as Sidebar from '@/components/ui/sidebar';
	import { Toaster } from '@/components/ui/sonner';
	import { currentUser, currentUserCompany, scrubinClient } from '@/scrubinClient/client.js';
	import { ModeWatcher, setMode } from 'mode-watcher';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	let { data, children } = $props();

	let isAuthenticatedState = $state(false);
	let showTermsModal = $state(false);
	let termsUrl = $state<string | null>(null);
	let privacyUrl = $state<string | null>(null);
	let isSubmittingAcceptance = $state(false);

	currentUser.set(data.user);
	currentUserCompany.set(data.company);
	setMode('light');

	onMount(async () => {
		await scrubinClient.ensureAuth();
		isAuthenticatedState = true;
		await ensureTermsAccepted();
	});

	$effect(() => {
		void $locale; // track locale changes
		if (showTermsModal) {
			ensureTermsAccepted();
		}
	});

	async function ensureTermsAccepted() {
		try {
			const user = await scrubinClient.portal.getUser();
			currentUser.set(user);
			if (user.mustAcceptTerms !== null || user.mustAcceptPrivacy !== null) {
				termsUrl = user.mustAcceptTerms;
				privacyUrl = user.mustAcceptPrivacy;
				showTermsModal = true;
			}
		} catch {
			// If fetching user fails here, do nothing; auth flow handles it elsewhere
		}
	}

	async function handleAcceptTerms() {
		isSubmittingAcceptance = true;
		try {
			await scrubinClient.portal.acceptTermsAndPolicy();
			const updated = await scrubinClient.portal.getUser();
			currentUser.set(updated);
			showTermsModal = false;
		} catch {
			toast.error('Failed');
		} finally {
			isSubmittingAcceptance = false;
		}
	}
</script>

<svelte:head>
	<title>{$t('app.title')}</title>
</svelte:head>

<!-- {#if data.user.isDemoUser}
<div class="fixed top-0 left-0 w-full h-full bg-black/50 z-50">
	<div class="flex items-center justify-center h-full">
		<div class="text-white text-2xl">
			Demo User
		</div>
	</div>
</div>
{/if} -->
{#if !isAuthenticatedState}
	<div class="flex min-h-screen items-center justify-center">
		<div class="text-center">
			<p class="text-2xl font-bold">Authenticating...</p>
		</div>
	</div>
{:else}
	<ModeWatcher />
	<Toaster />
	<AnalyzingOverlay />
	<Sidebar.Provider>
		<AppSidebar user={data.user} />
		<Sidebar.Inset>
			<header class="flex h-16 shrink-0 items-center gap-2">
				<div class="flex items-center gap-2 px-4">
					<Sidebar.Trigger class="-ml-1" />
				</div>
			</header>
			<div class="flex flex-1 flex-col gap-4 p-4 pt-0">
				{#if showTermsModal}
					<div class="mx-auto w-full max-w-3xl py-8">
						<div class="rounded-lg border border-clinical-light-border bg-white p-6 shadow-sm">
							<h1 class="font-serif text-xl font-semibold text-clinical-light-text">
								{$t('portal.terms.title')}
							</h1>
							<p class="mt-2 text-sm text-clinical-light-text-muted">
								{$t('portal.terms.description')}
							</p>

							{#if termsUrl}
								<p class="mt-6 text-sm text-clinical-light-text">
									{$t('portal.terms.agree_prefix')}
									<a href={termsUrl} target="_blank" rel="noopener" class="text-primary underline">
										{$t('portal.terms.terms_label')}
									</a>.
								</p>
							{/if}
							{#if privacyUrl}
								<p class="mt-4 text-sm text-clinical-light-text">
									{$t('portal.terms.privacy_prefix')}
									<a href={privacyUrl} target="_blank" rel="noopener" class="text-primary underline">
										{$t('portal.terms.privacy_label')}
									</a>.
								</p>
							{/if}

							<div class="mt-6">
								<Button disabled={isSubmittingAcceptance} onclick={handleAcceptTerms}>
									{#if isSubmittingAcceptance}
										{$t('portal.terms.saving')}
									{:else}
										{$t('portal.terms.accept_and_continue')}
									{/if}
								</Button>
							</div>
						</div>
					</div>
				{:else}
					{@render children()}
				{/if}
			</div>
		</Sidebar.Inset>
	</Sidebar.Provider>
{/if}
