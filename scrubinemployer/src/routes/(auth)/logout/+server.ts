import { redirect } from '@sveltejs/kit';

export function GET({ locals }) {
	locals.scrubinClient.authStore.clear();
	locals.user = undefined;

	redirect(303, '/login');
}
