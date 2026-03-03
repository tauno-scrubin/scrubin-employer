import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();

	return {
		showCompanyStats: user?.email === 'tallulah.lock@forhealth.com.au'
	};
};
