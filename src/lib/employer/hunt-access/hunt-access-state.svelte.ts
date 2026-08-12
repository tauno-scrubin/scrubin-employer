import type { HuntAccessRow, HuntRole, TeamMember } from '$lib/scrubinClient';
import { scrubinClient } from '$lib/scrubinClient/client';

/**
 * State for the "Shared with" panel on the hunt detail page. Holds the
 * per-hunt grants and exposes the mutations. One instance per hunt.
 */
export class HuntAccessState {
	huntId: number;
	grants = $state<HuntAccessRow[]>([]);
	teamMembers = $state<TeamMember[]>([]);
	loading = $state(false);
	error = $state<string | null>(null);

	constructor(huntId: number) {
		this.huntId = huntId;
	}

	async refresh() {
		this.loading = true;
		this.error = null;
		try {
			const [grants, teamMembers] = await Promise.all([
				scrubinClient.huntAccess.list(this.huntId),
				scrubinClient.team.listMembers().catch(() => [] as TeamMember[])
			]);
			this.grants = grants;
			this.teamMembers = teamMembers;
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Failed to load hunt access';
		} finally {
			this.loading = false;
		}
	}

	/** Managers who can still be granted per-hunt access. */
	availableManagers(): TeamMember[] {
		const granted = new Set(this.grants.map((g) => g.userId));
		return this.teamMembers.filter((m) => !granted.has(m.userId) && m.role === 'manager');
	}

	/** Owners/admins — always have access; shown informationally, not grantable. */
	mainAccounts(): TeamMember[] {
		return this.teamMembers.filter((m) => m.role === 'owner' || m.role === 'admin');
	}

	/**
	 * @deprecated Prefer `availableManagers`. Kept so older call sites keep compiling.
	 */
	availableTeammates(): TeamMember[] {
		return this.availableManagers();
	}

	/**
	 * True when the company has no managers to share with yet — distinguishes
	 * "no managers exist" from "every manager already has access".
	 */
	hasNoTeammates(): boolean {
		return this.teamMembers.filter((m) => m.role === 'manager').length === 0;
	}

	async grant(userId: number, huntRole: HuntRole) {
		await scrubinClient.huntAccess.grant(this.huntId, userId, huntRole);
		await this.refresh();
	}

	async changeRole(accessId: number, huntRole: HuntRole) {
		await scrubinClient.huntAccess.changeRole(this.huntId, accessId, huntRole);
		await this.refresh();
	}

	async revoke(accessId: number) {
		await scrubinClient.huntAccess.revoke(this.huntId, accessId);
		await this.refresh();
	}
}
