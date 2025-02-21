import { PUBLIC_API_URL } from '$env/static/public';
import { ScrubinClient } from '@/scrubinClient';
import type { Handle } from '@sveltejs/kit';

const allowedHeaders = ['retry-after', 'content-type', 'set-cookie', 'access-control-allow-origin'];

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.scrubinClient = new ScrubinClient(PUBLIC_API_URL);
	event.locals.scrubinClient.authStore.loadFromCookie(event.request.headers.get('cookie') || '');

	try {
		if (await event.locals.scrubinClient.ensureAuth()) {
			event.locals.user = await event.locals.scrubinClient.portal.getUser();
		} else {
			event.locals.user = undefined;
			event.locals.scrubinClient.authStore.clear();
		}
	} catch (error) {
		event.locals.user = undefined;
		event.locals.scrubinClient.authStore.clear();
		console.error(error);
	}
  
	const response = await resolve(event, {
		filterSerializedResponseHeaders: (name) => allowedHeaders.includes(name)
	});
  
	// Set cookies from both authStore and API response
	response.headers.set(
		'set-cookie',
		event.locals.scrubinClient.authStore.exportToCookie({
			secure: event.url.protocol === 'https:',
			httpOnly: false
		})
	);
  
	return response;
};