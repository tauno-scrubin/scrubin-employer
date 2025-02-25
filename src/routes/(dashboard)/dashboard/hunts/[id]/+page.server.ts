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
        const hunt = await locals.scrubinClient.hunt.getRequirements(huntId);

        
        return {
            hunt
        };
    } catch (err) {
        console.error('Error loading hunt data:', err);
        throw error(500, 'Failed to load hunt data');
    }
};
