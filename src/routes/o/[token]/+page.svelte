<script lang="ts">
	import { onMount } from 'svelte';

	let { data } = $props();

	type RedeemState = 'pending' | 'used' | 'invalid' | 'error';
	let state = $state<RedeemState>('pending');

	function looksLikeBot(): boolean {
		if (typeof navigator === 'undefined') return true;
		if (navigator.webdriver === true) return true;
		if (!navigator.languages || navigator.languages.length === 0) return true;
		if (window.outerWidth === 0 || window.outerHeight === 0) return true;
		if ('prerendering' in document && (document as { prerendering?: boolean }).prerendering) return true;
		return false;
	}

	async function redeem() {
		try {
			const res = await fetch('/api/outreach/redeem', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token: data.token })
			});
			const body = await res.json();
			// Success → dashboard. Failure (used/expired/invalid/error) → marketing landing.
			// Both cases carry `next`; fall through to error UI only if the network failed.
			if (body.next) {
				window.location.assign(body.next);
				return;
			}
			state = body.reason ?? 'error';
		} catch {
			state = 'error';
		}
	}

	onMount(async () => {
		if (looksLikeBot()) return;
		// Small idle delay — many email scanners give up before 200 ms
		await new Promise((r) => setTimeout(r, 250));
		await redeem();
	});
</script>

<svelte:head>
	<title>Scrubin</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-white px-4">
	<div class="flex max-w-sm flex-col items-center text-center">
		<div class="mb-6 text-2xl font-semibold tracking-tight text-gray-900">Scrubin</div>

		{#if state === 'pending'}
			<div class="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900"></div>
			<p class="text-base text-gray-700">Validating…</p>
		{:else if state === 'used'}
			<h1 class="mb-2 text-lg font-semibold text-gray-900">This link has already been used</h1>
			<p class="text-sm text-gray-600">
				<a href="https://scrubin.io/" class="text-blue-600 underline">Visit Scrubin</a>
			</p>
		{:else if state === 'invalid'}
			<h1 class="mb-2 text-lg font-semibold text-gray-900">Link expired</h1>
			<p class="text-sm text-gray-600">
				This invitation link is no longer valid. <a href="https://scrubin.io/" class="text-blue-600 underline">Visit Scrubin</a>.
			</p>
		{:else}
			<h1 class="mb-2 text-lg font-semibold text-gray-900">Something went wrong</h1>
			<p class="text-sm text-gray-600">
				Please try again later or <a href="https://scrubin.io/" class="text-blue-600 underline">visit Scrubin</a>.
			</p>
		{/if}
	</div>
</div>
