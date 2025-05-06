import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { availableLanguages, defaultLanguage, isLanguageSupported } from './config';
import en from './locales/en/common.json';
import es from './locales/es/common.json';

// Create a map of all translations
const translations: Record<string, any> = {
	en,
	es
};

// Get initial locale based on:
// 1. localStorage preference (if in browser)
// 2. navigator language (if in browser)
// 3. Default to the default language
function getInitialLocale(): string {
	if (browser) {
		// First check localStorage for saved preference
		const savedLocale = localStorage.getItem('preferredLanguage');
		if (savedLocale && isLanguageSupported(savedLocale)) {
			return savedLocale;
		}

		// Then check browser language
		const browserLang = window.navigator.language.split('-')[0];
		if (isLanguageSupported(browserLang)) {
			return browserLang;
		}
	}

	// Default language
	return defaultLanguage;
}

// Create a store for the current locale
export const locale = writable(getInitialLocale());

// Watch for changes to the locale and save to localStorage
if (browser) {
	locale.subscribe((value) => {
		if (value) {
			localStorage.setItem('preferredLanguage', value);
		}
	});
}

// Function to get a nested property from an object using a path string
function getNestedProperty(obj: any, path: string) {
	return path
		.split('.')
		.reduce((prev, curr) => (prev && prev[curr] !== undefined ? prev[curr] : undefined), obj);
}

// Create a derived store for translations
export const t = derived(locale, ($locale) => {
	return (key: string, vars: Record<string, string> = {}) => {
		// Get the translation from the current locale
		let text = getNestedProperty(translations[$locale], key);

		// Fallback to default language if the translation doesn't exist
		if (!text && $locale !== defaultLanguage) {
			text = getNestedProperty(translations[defaultLanguage], key);
		}

		// Return the key if no translation is found
		if (!text) return key;

		// Replace any variables in the translation
		Object.keys(vars).forEach((k) => {
			const regex = new RegExp(`{{${k}}}`, 'g');
			text = text.replace(regex, vars[k]);
		});

		return text;
	};
});

// List of available locales
export const locales = availableLanguages;

// Dummy loading store (not needed in this simplified approach)
export const loading = writable(false);

// Function to set the current locale
export async function loadTranslations(newLocale: string) {
	// Validate the locale
	if (isLanguageSupported(newLocale)) {
		locale.set(newLocale);
	} else {
		console.warn(`Language '${newLocale}' is not supported, using default language instead.`);
		locale.set(defaultLanguage);
	}
	return Promise.resolve();
}
