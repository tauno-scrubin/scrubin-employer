import { browser } from '$app/environment';
import { locale } from '$lib/i18n';
import { defaultLanguage, isLanguageSupported } from '$lib/i18n/config';
import { currentUser, scrubinClient } from '$lib/scrubinClient/client';
import { get } from 'svelte/store';

/**
 * Global function to change the app language
 * - Updates locale store
 * - Saves to localStorage
 * - Updates HTML lang attribute
 * - Updates user's language preference in database if logged in
 */
export async function changeLanguage(lang: string): Promise<void> {
	// Validate the language
	if (!isLanguageSupported(lang)) {
		console.warn(`Language '${lang}' is not supported, using default language instead.`);
		lang = defaultLanguage;
	}

	// Set the locale store to trigger the subscription that updates localStorage
	locale.set(lang);

	// Also update directly for redundancy
	if (browser) {
		localStorage.setItem('preferredLanguage', lang);
		document.documentElement.setAttribute('lang', lang);
	}

	// If user is logged in, update their language preference in the database
	const currentUserStore = get(currentUser);
	if (currentUserStore?.userLanguage !== lang) {
		try {
			await scrubinClient.portal.updateUserLanguage(lang);
			if (currentUserStore) {
				currentUserStore.userLanguage = lang;
				currentUser.set(currentUserStore);
			}
		} catch (error) {
			console.error('Failed to update user language in database:', error);
			// Continue as we've already updated the local language settings
		}
	}
}

/**
 * Get the display name of a language
 */
export function getLanguageDisplayName(langCode: string): string {
	// This will be handled by the i18n translation
	return `languages.${langCode}`;
}
