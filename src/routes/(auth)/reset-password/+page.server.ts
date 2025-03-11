import type { Actions } from '@sveltejs/kit';
import type { ResetPasswordBody } from '../auth';

export const actions : Actions = {
	async default({ locals, request, cookies }) {
		const bodyRaw = Object.fromEntries(await request.formData()) as unknown;
		const body = bodyRaw as ResetPasswordBody;

		try {
			await locals.scrubinClient.requestPasswordReset(body.email);
			return { message: 'An email has been sent to reset your password!' };
		} catch (e: unknown) {
			console.error('Error:', e);
			const catachable = e as Error;
			return { errorMessage: catachable.message };
		}
	}
};
