import { redirect, type Actions } from "@sveltejs/kit";
import type { LoginBody } from "../auth";
import type { SignupCompanyPayload } from "@/scrubinClient";


export const actions : Actions = {
	async default({ locals, request, cookies }) {
	const bodyRaw = Object.fromEntries(await request.formData()) as unknown;
	const body = bodyRaw as SignupCompanyPayload;

	try {
		// Create a proper SignupCompanyPayload object
		const signupPayload = {
			email: body.email,
			firstName: body.firstName || '',
			lastName: body.lastName || '',
			phone: body.phone || '',
			companyName: body.companyName || ''
		};
		
		const result = await locals.scrubinClient.signupCompanyWithEmail(signupPayload);
		console.log(result);
		
	} catch (e: unknown) {
		console.error('Error:', e);
		const catachable = e as Error;
		return { errorMessage: catachable.message };
	}

	redirect(303, '/dashboard');
}
}
