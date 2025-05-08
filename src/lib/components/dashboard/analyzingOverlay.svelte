<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Sparkles } from 'lucide-svelte';
	import { fade } from 'svelte/transition';
	import { visible, title } from './overlay';
	import ShinyText from '../shinyText.svelte';
	import { t } from '$lib/i18n';

	const messages = [
		$t('dashboard.analyzingOverlay.analyzing'),
		$t('dashboard.analyzingOverlay.processing'),
		$t('dashboard.analyzingOverlay.generating'),
		$t('dashboard.analyzingOverlay.thinking'),
		$t('dashboard.analyzingOverlay.exploring'),
		$t('dashboard.analyzingOverlay.connecting'),
		$t('dashboard.analyzingOverlay.crafting'),
		$t('dashboard.analyzingOverlay.considering'),
		$t('dashboard.analyzingOverlay.refining'),
		$t('dashboard.analyzingOverlay.almostThere')
	];

	let currentMessageIndex = $state(0);
	let currentMessage = $state(messages[0]);
	let intervalId: ReturnType<typeof setInterval>;

	onMount(() => {
		startMessageRotation();
	});

	onDestroy(() => {
		clearInterval(intervalId);
	});

	function startMessageRotation() {
		intervalId = setInterval(() => {
			const randomIndex = Math.floor(Math.random() * messages.length);
			currentMessageIndex = randomIndex;
			currentMessage = messages[randomIndex];
		}, 2000);
	}
</script>

{#if $visible}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center"
		transition:fade={{ duration: 300 }}
	>
		<!-- Blurred background overlay -->
		<div class="absolute inset-0 bg-white/70 backdrop-blur-md"></div>

		<!-- Content container -->
		<div
			class="relative z-10 flex w-full flex-col items-center justify-center space-y-6 text-center"
		>
			<!-- Sparkles icon with subtle animation -->
			<div class="">
				<Sparkles fill="currentColor" size={48} class="text-blue-500" strokeWidth={1.5} />
			</div>

			<!-- Rotating message with fade transition -->
			<div class="relative h-12 w-full">
				{#key currentMessage}
					<p
						class="absolute top-0 w-full text-center text-lg font-normal text-gray-800"
						transition:fade={{ duration: 200 }}
					>
						<ShinyText>{currentMessage}</ShinyText>
					</p>
				{/key}
			</div>
		</div>
	</div>
{/if}
