import { loadTranslations } from '$lib/i18n';
import { browser } from '$app/environment';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ data }) => {
	// Initialize translations based on the locale from the server
	// But only on server-side rendering or first load, not during client-side navigation
	if (data.i18n && data.i18n.locale && !browser) {
		await loadTranslations(data.i18n.locale);
	}

	return {
		...data
	};
};
