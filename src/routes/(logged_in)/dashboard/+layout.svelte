<script lang="ts">
	import AppSidebar from '@/components/app-sidebar.svelte';
	import AnalyzingOverlay from '@/components/dashboard/analyzingOverlay.svelte';
	import * as Sidebar from '@/components/ui/sidebar';
	import { Toaster } from '@/components/ui/sonner';
	import { currentUser, currentUserCompany, scrubinClient } from '@/scrubinClient/client.js';
	import { t } from '$lib/i18n';
	import { ModeWatcher, setMode } from 'mode-watcher';
	import { onMount } from 'svelte';

	let { data, children } = $props();

	let isAuthenticatedState = $state(false);

	currentUser.set(data.user);
	currentUserCompany.set(data.company);
	setMode('light');

	onMount(async () => {
		await checkAuth();
	});

	async function checkAuth() {
		try {
			const isAuthenticated = await scrubinClient.ensureAuth();
			isAuthenticatedState = isAuthenticated;
			if (!isAuthenticated) {
				window.location.href = 'https://auth.scrubin.io/';
			}
		} catch (error) {
			isAuthenticatedState = false;
			window.location.href = 'https://auth.scrubin.io/';
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
				{@render children()}
			</div>
		</Sidebar.Inset>
	</Sidebar.Provider>
{/if}
