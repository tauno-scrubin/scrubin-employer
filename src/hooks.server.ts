import { PUBLIC_API_URL } from '$env/static/public';
import { ScrubinClient } from '@/scrubinClient';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

const allowedHeaders = ['retry-after', 'content-type', 'set-cookie', 'access-control-allow-origin'];

// This hook handles the language attribute in the HTML tag
const handleLang: Handle = async ({ event, resolve }) => {
	// Get locale from the event or use the default 'en'
	// We'll set this in the layout.server.ts load function
	const lang = (event.locals.locale as string) || 'en';

	return resolve(event, {
		transformPageChunk: ({ html }) => {
			return html.replace('%lang%', lang);
		}
	});
};

// Original API handler
const handleAPI: Handle = async ({ event, resolve }) => {
	event.locals.scrubinClient = new ScrubinClient(PUBLIC_API_URL);
	event.locals.scrubinClient.authStore.loadFromCookie(event.request.headers.get('cookie') || '');

	const token = event.url.searchParams.get('token');
	if (token) {
		await event.locals.scrubinClient.authWithToken(token);
	}

	try {
		if (await event.locals.scrubinClient.ensureAuth()) {
			event.locals.user = await event.locals.scrubinClient.portal.getUser();
			event.locals.company = await event.locals.scrubinClient.company.getCompany();
		} else {
			event.locals.user = undefined;
			event.locals.company = undefined;
			event.locals.scrubinClient.authStore.clear();
		}
	} catch (error) {
		event.locals.user = undefined;
		event.locals.company = undefined;
		event.locals.scrubinClient.authStore.clear();
		console.error(error);
	}

	const response = await resolve(event, {
		filterSerializedResponseHeaders: (name) => allowedHeaders.includes(name)
	});

	// Set cookies
	response.headers.set(
		'set-cookie',
		event.locals.scrubinClient.authStore.exportToCookie({
			secure: event.url.protocol === 'https:',
			httpOnly: false
		})
	);

	return response;
};

// Combine the two handlers
export const handle = sequence(handleLang, handleAPI);
