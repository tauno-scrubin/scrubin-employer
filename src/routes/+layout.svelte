<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { locale, t } from '$lib/i18n';
	import { isLanguageSupported } from '$lib/i18n/config';
	import { scrubinClient } from '@/scrubinClient/client';
	import { onMount } from 'svelte';
	import { toast, Toaster } from 'svelte-sonner';
	import '../app.css';

	let { children, data } = $props();

	let loading = $state(true);

	// Flag to track if we've already initialized the language preference
	// This needs to be outside reactive contexts to persist across navigations
	let hasInitializedLanguage = false;

	async function handleTokenAuthentication() {
		const token = page.url.searchParams.get('token');
		if (token) {
			try {
				await scrubinClient.authWithToken(token);

				// Remove token from URL after successful authentication
				const newUrl = new URL(page.url);
				newUrl.searchParams.delete('token');
				await goto(newUrl.pathname + newUrl.search, { replaceState: true });
				return true;
			} catch (error) {
				console.error('Token authentication failed:', error);
				toast.error('Authentication failed');

				// If token auth fails, redirect to auth portal
				window.location.href = 'https://auth.scrubin.io/';
				return false;
			}
		}
		return true;
	}

	async function checkAuth() {
		try {
			// First, handle token authentication if present
			const tokenAuthSuccess = await handleTokenAuthentication();
			if (!tokenAuthSuccess) {
				return; // Token auth failed, already redirected
			}

			// Check if user is authenticated
			if (!scrubinClient.authStore.isValid) {
				window.location.href = 'https://auth.scrubin.io/';
				return;
			}
		} catch (error) {
			console.error('Error checking auth:', error);
			// For other errors, show toast but don't redirect
			toast.error('Failed to load profile information');
			window.location.href = 'https://auth.scrubin.io/';
		} finally {
			loading = false;
		}
	}

	// Update the HTML lang attribute when locale changes
	$effect(() => {
		if (browser && $locale) {
			document.documentElement.setAttribute('lang', $locale);
		}
		checkAuth();
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
		const url = page.url.pathname;
	});
</script>

{#if loading}
	<div class="flex min-h-screen items-center justify-center">
		<div class="text-center">
			<svg
				class="mx-auto h-8 w-8 animate-spin text-primary"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
			>
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
			<p class="mt-2 text-sm text-gray-600">{$t('common.loading')}</p>
		</div>
	</div>
{:else}
	{@render children()}
{/if}

<Toaster />
