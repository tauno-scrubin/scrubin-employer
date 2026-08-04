import { goto } from '$app/navigation';
import { get } from 'svelte/store';
import { toast } from 'svelte-sonner';
import { t } from '$lib/i18n';
import { canCreateHunts } from '$lib/permissions';
import { currentUser } from '$lib/scrubinClient/client';

/**
 * The create-hunt wizard spans four routes that a view-only member can reach by
 * typing the URL. Each one calls this first: it bounces them back to the
 * dashboard instead of rendering a wizard whose every API call would 403.
 *
 * Returns true when the caller may proceed.
 */
export function guardHuntWizard(): boolean {
	if (canCreateHunts(get(currentUser))) return true;
	toast.error(get(t)('team.errors.cannotCreateHunts'));
	goto('/dashboard');
	return false;
}
