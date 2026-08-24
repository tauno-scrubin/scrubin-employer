import type { PageLoad } from './$types';

/**
 * Test hook: `/o/preview-<state>` renders the splash without ever calling the redeem API, so every
 * state can be checked on a real device without burning the single-use sign-in token.
 * Real outreach tokens are JWTs, so this prefix can never shadow one.
 */
const PREVIEW_PREFIX = 'preview-';

export const load: PageLoad = ({ params }) => ({
	token: params.token,
	preview: params.token.startsWith(PREVIEW_PREFIX)
		? params.token.slice(PREVIEW_PREFIX.length)
		: null
});
