import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { scrubinClient } from '$lib/scrubinClient/client';

export const load: PageServerLoad = async ({ params, locals }) => {
    if (!locals.scrubinClient.authStore.isValid) {
        throw error(401, 'Unauthorized');
    }

    try {
        const huntId = parseInt(params.id);
        
        // Get hunt details
        const [hunt, stats, candidates] = await Promise.all([
            locals.scrubinClient.hunt.getHuntById(huntId),
            locals.scrubinClient.hunt.getHuntStats(huntId),
            locals.scrubinClient.hunt.getHuntCandidates(huntId)
        ]);

        
        return {
            hunt,
            stats,
            candidates
        };
    } catch (err) {
        console.error('Error loading hunt data:', err);
        throw error(500, 'Failed to load hunt data');
    }
};
