import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { chatSessionId } = params;

	return {
		chatSessionId,
		initialMessage: '' // This will be populated from the session data
	};
};
