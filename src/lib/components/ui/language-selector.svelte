<script lang="ts">
	import Globe from 'lucide-svelte/icons/globe';
	import { Button } from './button';
	import * as DropdownMenu from './dropdown-menu/index.js';
	import { availableLanguages } from '$lib/i18n/config';
	import { locale, t } from '$lib/i18n';
	import { changeLanguage } from '$lib/utils/languageUtils';

	/**
	 * Class to apply to the button
	 */
	export let buttonClass = '';

	/**
	 * Position of the dropdown menu
	 */
	export let position: 'top' | 'bottom' | 'right' | 'left' = 'bottom';

	/**
	 * Variant of the button
	 */
	export let variant: 'default' | 'outline' | 'ghost' = 'ghost';

	/**
	 * Size of the button
	 */
	export let size: 'default' | 'sm' | 'lg' | 'icon' = 'default';

	/**
	 * Handle language selection
	 */
	function handleSelectLanguage(lang: string) {
		changeLanguage(lang);
	}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		<Button {variant} {size} class={buttonClass}>
			<Globe class="mr-2 h-4 w-4" />
			<span>{$t(`languages.${$locale}`)}</span>
		</Button>
	</DropdownMenu.Trigger>
	<DropdownMenu.Content side={position} align="end" sideOffset={4}>
		{#each availableLanguages as lang}
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<div on:click={() => handleSelectLanguage(lang)} role="menuitem" tabindex="0">
				<DropdownMenu.Item class={$locale === lang ? 'bg-accent' : ''}>
					{$t(`languages.${lang}`)}
				</DropdownMenu.Item>
			</div>
		{/each}
	</DropdownMenu.Content>
</DropdownMenu.Root>
