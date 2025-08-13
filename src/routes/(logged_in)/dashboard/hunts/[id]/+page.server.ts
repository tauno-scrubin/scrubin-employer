import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	if (!locals.scrubinClient.authStore.isValid) {
		throw error(401, 'Unauthorized');
	}

	try {
		const huntId = parseInt(params.id);

		// Get hunt details first to derive requirement id for chat session
		const hunt = await locals.scrubinClient.hunt.getHuntById(huntId);

		// Fetch in parallel: stats and requirement chat session (for agent chat + unified requirements view)
		// const [stats, requirementSession] = await Promise.all([
		// 	locals.scrubinClient.hunt.getHuntStats(huntId),
		// 	locals.scrubinClient.hunt.getRequirementChatResult(hunt.requirements.id)
		// ]);
		// Fetch in parallel: stats and requirement chat session (for agent chat + unified requirements view)
		const [stats] = await Promise.all([
			locals.scrubinClient.hunt.getHuntStats(huntId)
		]);

		return {
			hunt,
			stats
		}
	} catch (err) {
		console.error('Error loading hunt data:', err);
		throw error(500, 'Failed to load hunt data');
	}
};
