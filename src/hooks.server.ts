import { PUBLIC_API_URL } from '$env/static/public';
import { ScrubinClient } from '@/scrubinClient';
import { redirect, type Handle } from '@sveltejs/kit';
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

function getClientIP(request: Request): string {
	const forwardedFor = request.headers.get('x-forwarded-for');
	if (forwardedFor) {
		return forwardedFor.split(',')[0].trim();
	}
	const realIp = request.headers.get('x-real-ip');
	if (realIp) {
		return realIp;
	}
	return '';
}

// Original API handler
const handleAPI: Handle = async ({ event, resolve }) => {
	event.locals.scrubinClient = new ScrubinClient(PUBLIC_API_URL);
	event.locals.scrubinClient.authStore.loadFromCookie(event.request.headers.get('cookie') || '');

	// Set client IP for forwarding in all backend requests
	const clientIP = getClientIP(event.request);
	if (clientIP) {
		event.locals.scrubinClient.setClientIP(clientIP);
	}

	// Check if URL contains token parameter
	const url = event.url;
	const urlToken = url.searchParams.get('token');
	if (urlToken) {
		// Clear authStore and let frontend handle token validation
		event.locals.scrubinClient.authStore.clear();
		event.locals.user = undefined;
		event.locals.company = undefined;
		let cleanUrl: URL | null = new URL(url);
		try {
			// authWithToken will automatically use the client IP set on the instance
			await event.locals.scrubinClient.authWithToken(urlToken, event.cookies);
			event.locals.user = await event.locals.scrubinClient.portal.getUser();
			cleanUrl.searchParams.delete('token');
		} catch (error) {
			cleanUrl = null;
			console.error(error);
			event.locals.user = undefined;
			event.locals.scrubinClient.authStore.clear();
		}

		if (cleanUrl) {
			throw redirect(302, cleanUrl);
		}
	} else {
		try {
			if (event.locals.scrubinClient.authStore.token) {
				const isAuth = await event.locals.scrubinClient.ensureAuth(event.cookies);
				if (isAuth && !event.locals.user) {
					event.locals.user = await event.locals.scrubinClient.portal.getUser();
				}
				if (isAuth && !event.locals.company) {
					event.locals.company = await event.locals.scrubinClient.company.getCompany();
				}
			} else {
				event.locals.user = undefined;
				event.locals.scrubinClient.authStore.clear();
			}
		} catch (error) {
			event.locals.user = undefined;
			event.locals.company = undefined;
			event.locals.scrubinClient.authStore.clear();
			console.error(error);
		}

		//Vana
		// const cookies = event.request.headers.get('cookie') || '';
		// // Normal authentication flow
		// event.locals.scrubinClient.authStore.loadFromCookie(event.request.headers.get('cookie') || '');

		// try {
		// 	if (
		// 		event.locals.scrubinClient.authStore.token &&
		// 		(await event.locals.scrubinClient.ensureAuth())
		// 	) {
		// 		event.locals.user = await event.locals.scrubinClient.portal.getUser();
		// 		event.locals.company = await event.locals.scrubinClient.company.getCompany();
		// 	} else {
		// 		event.locals.user = undefined;
		// 		event.locals.company = undefined;
		// 		event.locals.scrubinClient.authStore.clear();
		// 	}
		// } catch (error) {
		// 	console.error(error);
		// 	event.locals.user = undefined;
		// 	event.locals.company = undefined;
		// 	throw redirect(307, 'https://auth.scrubin.io/');
		// }
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
