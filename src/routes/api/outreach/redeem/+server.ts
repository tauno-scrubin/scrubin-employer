import { decodeToken } from '@/utils/tokenUtil';
import { json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	let token: string;
	try {
		const body = await request.json();
		token = body?.token;
	} catch {
		return json({ ok: false, reason: 'invalid' }, { status: 400 });
	}
	if (!token || typeof token !== 'string') {
		return json({ ok: false, reason: 'invalid' }, { status: 400 });
	}

	// Wrong audience — doctor token landed on employer host. Bounce to landing's redeem.
	try {
		const payload = decodeToken(token);
		if (payload.subType !== 'company') {
			return json({ ok: true, next: `https://scrubin.io/o/${token}` });
		}
	} catch {
		return json({ ok: false, reason: 'invalid' }, { status: 400 });
	}

	try {
		await locals.scrubinClient.authWithToken(token, cookies);
		// Pending companies hit the T&C modal in dashboard's +layout.svelte;
		// active companies just see the dashboard.
		return json({ ok: true, next: '/dashboard' });
	} catch (err) {
		// On any failure (used / expired / invalid / network), send them to the marketing
		// landing site rather than dumping them on auth.scrubin.io with no context.
		const message = err instanceof Error ? err.message.toLowerCase() : '';
		const reason = message.includes('used') || message.includes('already')
			? 'used'
			: message.includes('expired') || message.includes('invalid')
				? 'invalid'
				: 'error';
		return json({ ok: false, reason, next: 'https://scrubin.io/' });
	}
};
