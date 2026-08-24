<script lang="ts">
	import { onMount } from 'svelte';
	import { detectAutomation, OUTREACH_REVEAL_DELAY_SECONDS } from '$lib/utils/botHeuristics';

	let { data } = $props();

	type RedeemState =
		| 'preparing'
		| 'ready'
		| 'redeeming'
		| 'blocked'
		| 'used'
		| 'invalid'
		| 'error'
		| 'preview';
	let redeemState = $state<RedeemState>('preparing');
	let secondsLeft = $state(OUTREACH_REVEAL_DELAY_SECONDS);

	/** Terminal states a `/o/preview-<state>` link can jump straight to (see +page.ts). */
	const PREVIEWABLE: RedeemState[] = ['blocked', 'used', 'invalid', 'error'];
	const authLoginUrl = `https://auth.scrubin.io/login?magicLink=1&returnTo=${encodeURIComponent('https://employer.scrubin.io/')}`;

	onMount(() => {
		if (PREVIEWABLE.includes(data.preview as RedeemState)) {
			redeemState = data.preview as RedeemState;
			return;
		}
		if (detectAutomation() && !data.preview) {
			redeemState = 'blocked';
			return;
		}
		const timer = setInterval(() => {
			secondsLeft -= 1;
			if (secondsLeft > 0) return;
			clearInterval(timer);
			redeemState = 'ready';
		}, 1000);
		return () => clearInterval(timer);
	});

	/**
	 * Company invite links are single use, so an email scanner that opened this page used to burn the
	 * token before the recipient ever saw it — and the backend treats an opened link as proof of email
	 * ownership, so it also stamped `date_email_verified` for someone who never clicked. Hence two
	 * gates: the CTA is withheld for a few seconds (a CDP-driven click is a *trusted* event, so
	 * `isTrusted` alone would not stop a sandbox), then requires a real click.
	 */
	async function redeem(event: MouseEvent) {
		if (!event.isTrusted || redeemState !== 'ready') return;
		if (data.preview) {
			redeemState = 'preview';
			return;
		}
		redeemState = 'redeeming';
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
			redeemState = body.reason ?? 'error';
		} catch {
			redeemState = 'error';
		}
	}
</script>

<svelte:head>
	<title>Scrubin</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-white px-4 py-10">
	<div class="flex w-full max-w-md flex-col items-center text-center">
		<div class="mb-6 text-2xl font-semibold tracking-tight text-gray-900">Scrubin</div>

		{#if redeemState === 'preparing' || redeemState === 'ready'}
			<h1 class="mb-3 text-lg font-semibold text-gray-900">Continue to Scrubin</h1>
			<p class="mb-6 text-sm leading-relaxed text-gray-600">
				You opened a one-time link from the email we sent. Continue to open the employer portal —
				no password needed.
			</p>

			{#if redeemState === 'ready'}
				<button
					type="button"
					onclick={redeem}
					class="w-full rounded-md bg-gray-900 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
				>
					Continue to Scrubin
				</button>
			{:else}
				<div
					class="flex w-full items-center justify-center gap-3 rounded-md border border-gray-200 px-6 py-3 text-base text-gray-500"
				>
					<div
						class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-500"
					></div>
					Checking your link… {secondsLeft}s
				</div>
			{/if}

			<!-- The countdown itself is not a live region: announcing every tick is noise. Announce once,
			     when the CTA actually appears. -->
			<p class="sr-only" aria-live="polite">
				{redeemState === 'ready' ? 'Your link is ready. Continue to Scrubin.' : ''}
			</p>
		{:else if redeemState === 'redeeming'}
			<div
				class="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900"
			></div>
			<p class="text-base text-gray-700">Opening Scrubin…</p>
		{:else if redeemState === 'preview'}
			<h1 class="mb-2 text-lg font-semibold text-gray-900">Preview only</h1>
			<p class="text-sm text-gray-600">
				A real link would open Scrubin here. The token was not used.
			</p>
		{:else if redeemState === 'blocked'}
			<h1 class="mb-2 text-lg font-semibold text-gray-900">Open in your browser</h1>
			<p class="text-sm text-gray-600">
				Please open this link in Chrome, Safari, or Firefox on your phone or computer.
			</p>
		{:else if redeemState === 'used'}
			<h1 class="mb-2 text-lg font-semibold text-gray-900">This link has already been used</h1>
			<p class="mb-6 text-sm leading-relaxed text-gray-600">
				Sign in with the email we contacted you on — we'll send a fresh login link.
			</p>
			<a
				href={authLoginUrl}
				class="block w-full rounded-md bg-gray-900 px-6 py-3 text-center text-base font-medium text-white transition-colors hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
			>
				Sign in with email
			</a>
		{:else if redeemState === 'invalid'}
			<h1 class="mb-2 text-lg font-semibold text-gray-900">This link is no longer valid</h1>
			<p class="mb-6 text-sm leading-relaxed text-gray-600">
				Sign in with the email we contacted you on — we'll send a fresh login link.
			</p>
			<a
				href={authLoginUrl}
				class="block w-full rounded-md bg-gray-900 px-6 py-3 text-center text-base font-medium text-white transition-colors hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
			>
				Sign in with email
			</a>
		{:else}
			<h1 class="mb-2 text-lg font-semibold text-gray-900">Something went wrong</h1>
			<p class="text-sm text-gray-600">
				Please try again later or <a href="https://scrubin.io/" class="text-blue-600 underline"
					>visit Scrubin</a
				>.
			</p>
		{/if}
	</div>
</div>
