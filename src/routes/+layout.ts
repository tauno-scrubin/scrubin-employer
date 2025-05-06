import { loadTranslations } from '$lib/i18n';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ data }) => {
	// Initialize translations based on the locale from the server
	if (data.i18n && data.i18n.locale) {
		await loadTranslations(data.i18n.locale);
	}

	return {
		...data
	};
};
