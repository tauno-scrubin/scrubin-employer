import type { HuntRole, PortalUser } from './scrubinClient';

/**
 * Multi-user companies — UI-side permission helpers. Always mirror the
 * backend (CompanyContextService.assertHuntAccess / MainAccountGuard) which
 * remains the source of truth. These exist purely to hide / disable
 * controls the user couldn't successfully use anyway.
 *
 * When `team` is null (legacy single-user mode or pre-backfill), we behave
 * as if the user is a main account — same as today.
 */

function isLegacyOrMissing(user: PortalUser | null | undefined): boolean {
	return !user || !user.team;
}

export function isMainAccount(user: PortalUser | null | undefined): boolean {
	if (isLegacyOrMissing(user)) return true;
	return !!user!.team!.isMainAccount;
}

export function canManageTeam(user: PortalUser | null | undefined): boolean {
	return isMainAccount(user);
}

export function canManageBilling(user: PortalUser | null | undefined): boolean {
	if (isLegacyOrMissing(user)) return true;
	return user!.team!.role === 'owner';
}

/**
 * May this member create hunts and edit hunt requirements / ads at all? Main
 * accounts always may; a `manager` sub-user only on the `full` permission
 * level. Says nothing about *which* hunts — combine with `canWriteOnHunt`.
 */
export function hasFullAccess(user: PortalUser | null | undefined): boolean {
	if (isLegacyOrMissing(user)) return true;
	return user!.team!.isMainAccount || user!.team!.permissionLevel === 'full';
}

export function canCreateHunts(user: PortalUser | null | undefined): boolean {
	return hasFullAccess(user);
}

export function canManageHuntAccess(user: PortalUser | null | undefined): boolean {
	return isMainAccount(user);
}

/**
 * Per-hunt write permission. Pass the caller's role on this specific hunt
 * (loaded via the hunt detail endpoint or huntAccess.list). Main accounts
 * always get full access.
 */
export function canWriteOnHunt(user: PortalUser | null | undefined, huntRole: HuntRole | null | undefined): boolean {
	if (isMainAccount(user)) return true;
	return huntRole === 'collaborator';
}

/**
 * May the caller edit this hunt's requirements / job ad? Needs both axes: the
 * `full` permission level (or a main account) AND write access on this
 * specific hunt. A full member shared a hunt as `viewer` still gets read-only.
 */
export function canEditHuntDetails(
	user: PortalUser | null | undefined,
	huntRole: HuntRole | null | undefined
): boolean {
	return hasFullAccess(user) && canWriteOnHunt(user, huntRole);
}
