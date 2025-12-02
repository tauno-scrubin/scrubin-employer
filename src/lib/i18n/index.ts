import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { availableLanguages, defaultLanguage, isLanguageSupported } from './config';
import en from './locales/en/index.json';
import es from './locales/es/index.json';
import et from './locales/et/index.json';
import fi from './locales/fi/index.json';
import fr from './locales/fr/index.json';
import de from './locales/de/index.json';
import enHuntDetails from './locales/en/huntDetails.json';
import esHuntDetails from './locales/es/huntDetails.json';
import etHuntDetails from './locales/et/huntDetails.json';
import fiHuntDetails from './locales/fi/huntDetails.json';
import frHuntDetails from './locales/fr/huntDetails.json';
import deHuntDetails from './locales/de/huntDetails.json';
import enFaq from './locales/en/faq.json';
import esFaq from './locales/es/faq.json';
import etFaq from './locales/et/faq.json';
import fiFaq from './locales/fi/faq.json';
import frFaq from './locales/fr/faq.json';
import deFaq from './locales/de/faq.json';
import enRequirementsV2 from './locales/en/requirementsV2.json';
import esRequirementsV2 from './locales/es/requirementsV2.json';
import etRequirementsV2 from './locales/et/requirementsV2.json';
import fiRequirementsV2 from './locales/fi/requirementsV2.json';
import frRequirementsV2 from './locales/fr/requirementsV2.json';
import deRequirementsV2 from './locales/de/requirementsV2.json';

// Define recursive types properly to avoid circular references
interface TranslationObject {
	[key: string]: string | TranslationObject;
}

// Function to merge translations
function mergeTranslations(...objs: TranslationObject[]): TranslationObject {
	return objs.reduce((acc, obj) => {
		return { ...acc, ...obj };
	}, {});
}

// Create a map of all translations
const translations: Record<string, TranslationObject> = {
	en: mergeTranslations(en, enHuntDetails, enFaq, enRequirementsV2),
	es: mergeTranslations(es, esHuntDetails, esFaq, esRequirementsV2),
	et: mergeTranslations(et, etHuntDetails, etFaq, etRequirementsV2),
	fi: mergeTranslations(fi, fiHuntDetails, fiFaq, fiRequirementsV2),
	fr: mergeTranslations(fr, frHuntDetails, frFaq, frRequirementsV2),
	de: mergeTranslations(de, deHuntDetails, deFaq, deRequirementsV2)
};

// Get initial locale based on:
// 1. localStorage preference (if in browser)
// 2. navigator language (if in browser)
// 3. Default to the default language
export function getInitialLocale(): string {
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
			// Store the preference in localStorage for persistence across page loads
			localStorage.setItem('preferredLanguage', value);

			// Also update the HTML lang attribute directly
			// This provides redundancy with the effect in layout.svelte
			document.documentElement.setAttribute('lang', value);
		}
	});
}

// Function to get a nested property from an object using a path string
function getNestedProperty(obj: TranslationObject, path: string): string | undefined {
	const result = path.split('.').reduce<string | TranslationObject | undefined>((prev, curr) => {
		if (!prev || typeof prev !== 'object') return undefined;
		return prev[curr];
	}, obj);

	// Return only string values, not nested objects
	return typeof result === 'string' ? result : undefined;
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
		let result = text;
		Object.keys(vars).forEach((k) => {
			const regex = new RegExp(`{{${k}}}`, 'g');
			result = result.replace(regex, vars[k]);
		});

		return result;
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
