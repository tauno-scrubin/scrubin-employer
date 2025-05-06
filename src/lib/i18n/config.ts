// Language configuration for the application

// List of all supported languages
export const availableLanguages = ['en', 'es', 'et', 'fi', 'fr', 'de'] as const;

// Type for supported languages
export type SupportedLanguage = (typeof availableLanguages)[number];

// Default language
export const defaultLanguage: SupportedLanguage = 'en';

// Language display names in their native languages
export const languageNames: Record<SupportedLanguage, string> = {
	en: 'English',
	et: 'Eesti',
	es: 'Español',
	fi: 'Suomi',
	fr: 'Français',
	de: 'Deutsch'
};

// Function to check if a language is supported
export function isLanguageSupported(lang: string): lang is SupportedLanguage {
	return availableLanguages.includes(lang as SupportedLanguage);
}
