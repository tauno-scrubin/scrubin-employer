<script lang="ts">
	import '../app.css';
	import { t, locale, locales } from '$lib/i18n';
	import { browser } from '$app/environment';

	let { children, data } = $props();

	// Update the HTML lang attribute when locale changes
	$effect(() => {
		if (browser && $locale) {
			document.documentElement.setAttribute('lang', $locale);
		}
	});

	// Set locale from server data
	$effect(() => {
		if (data?.i18n?.locale) {
			$locale = data.i18n.locale;
		}
	});
</script>

{@render children()}
