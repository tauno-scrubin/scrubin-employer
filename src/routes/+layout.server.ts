import { loadTranslations } from '$lib/i18n';
import { availableLanguages, defaultLanguage, isLanguageSupported } from '$lib/i18n/config';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ url, request, locals }) => {
	const { pathname, searchParams } = url;

	// Priority for language selection:
	// 1. URL parameter 'lang'
	// 2. Company setting (if available)
	// 3. Accept-Language header
	// 4. Default language

	// Default to the default language
	let selectedLocale = defaultLanguage;

	// 1. Check URL parameter 'lang'
	const langParam = searchParams.get('lang');
	if (langParam && isLanguageSupported(langParam)) {
		selectedLocale = langParam;
	}
	// 2. Check company setting (if available)
	else if (
		locals.company &&
		locals.company.languageIso &&
		isLanguageSupported(locals.company.languageIso)
	) {
		selectedLocale = locals.company.languageIso;
	}
	// 3. Try to get the locale from Accept-Language header
	else {
		const acceptLanguageHeader = request.headers.get('accept-language');
		if (acceptLanguageHeader) {
			const preferredLocale = acceptLanguageHeader.split(',')[0].trim().split('-')[0];
			if (isLanguageSupported(preferredLocale)) {
				selectedLocale = preferredLocale;
			}
		}
	}

	// Store the locale in locals for the lang attribute in handleLang
	locals.locale = selectedLocale;

	await loadTranslations(selectedLocale);

	// Return any existing user data along with i18n data
	if (locals.user) {
		return {
			user: locals.user,
			company: locals.company,
			i18n: {
				locale: selectedLocale,
				locales: availableLanguages
			}
		};
	}

	return {
		user: undefined,
		i18n: {
			locale: selectedLocale,
			locales: availableLanguages
		}
	};
};
