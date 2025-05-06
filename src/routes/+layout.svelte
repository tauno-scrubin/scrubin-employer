<script lang="ts">
	import '../app.css';
	import { t, locale, locales } from '$lib/i18n';
	import { browser } from '$app/environment';
	import { isLanguageSupported } from '$lib/i18n/config';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let { children, data } = $props();

	// Flag to track if we've already initialized the language preference
	// This needs to be outside reactive contexts to persist across navigations
	let hasInitializedLanguage = false;

	// Update the HTML lang attribute when locale changes
	$effect(() => {
		if (browser && $locale) {
			document.documentElement.setAttribute('lang', $locale);
		}
	});

	// Only set the locale once on initial page load
	onMount(() => {
		if (browser && !hasInitializedLanguage) {
			// Don't override user's explicit localStorage preference
			const savedLocale = localStorage.getItem('preferredLanguage');
			if (savedLocale && isLanguageSupported(savedLocale)) {
				$locale = savedLocale;
			} else if (data?.i18n?.locale) {
				// Only use server preference if no localStorage preference exists
				$locale = data.i18n.locale;
			}
			hasInitializedLanguage = true;
		}
	});

	// This effect is only for SSR
	$effect(() => {
		if (!browser && data?.i18n?.locale) {
			// Server-side rendering, use server data
			$locale = data.i18n.locale;
		}
	});

	// Watch for URL changes but don't reset the language preference
	$effect(() => {
		// This is just to track navigation changes via $page.url
		// but we intentionally don't update the locale on navigation
		const url = $page.url.pathname;
	});
</script>

{@render children()}
