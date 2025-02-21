import { redirect } from '@sveltejs/kit';
import type { LoginBody } from '../auth';

export const actions = {
	async default({ locals, request, cookies }) {
		const bodyRaw = Object.fromEntries(await request.formData()) as unknown;
		const body = bodyRaw as LoginBody;

		try {
			const result = await locals.scrubinClient.authWithPassword(body.email, body.password);

		} catch (e: unknown) {
			console.error('Error:', e);
			const catachable = e as Error;
			return { errorMessage: catachable.message };
		}

		redirect(303, '/dashboard');
	}
};

export function load({ locals }) {
	if (locals.user) redirect(303, '/dashboard');
}
