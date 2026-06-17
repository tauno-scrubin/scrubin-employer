import type { HuntAccessRow, HuntRole, ShareLink, ShareLinkScope, TeamMember } from '$lib/scrubinClient';
import { scrubinClient } from '$lib/scrubinClient/client';

/**
 * State for the "Shared with" panel + share-link dialog on the hunt detail
 * page. Holds the per-hunt grants + active share links and exposes the
 * mutations. One instance per hunt (created in +page.svelte's onMount).
 */
export class HuntAccessState {
	huntId: number;
	grants = $state<HuntAccessRow[]>([]);
	shareLinks = $state<ShareLink[]>([]);
	teamMembers = $state<TeamMember[]>([]);
	loading = $state(false);
	error = $state<string | null>(null);
	lastCreatedUrl = $state<string | null>(null);

	constructor(huntId: number) {
		this.huntId = huntId;
	}

	async refresh() {
		this.loading = true;
		this.error = null;
		try {
			const [grants, shareLinks, teamMembers] = await Promise.all([
				scrubinClient.huntAccess.list(this.huntId),
				scrubinClient.huntAccess.listShareLinks(this.huntId),
				scrubinClient.team.listMembers().catch(() => [] as TeamMember[])
			]);
			this.grants = grants;
			this.shareLinks = shareLinks;
			this.teamMembers = teamMembers;
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Failed to load hunt access';
		} finally {
			this.loading = false;
		}
	}

	availableTeammates(): TeamMember[] {
		const granted = new Set(this.grants.map((g) => g.userId));
		return this.teamMembers.filter((m) => !granted.has(m.userId) && m.role === 'manager');
	}

	/**
	 * True when the company has no other team members to share with yet — the
	 * caller is the only member (active invites haven't been accepted, so they
	 * aren't in `teamMembers` yet). Distinguishes "no teammates exist" from
	 * "every teammate already has access", which need different empty-state copy.
	 */
	hasNoTeammates(): boolean {
		return this.teamMembers.length <= 1;
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

	async createShareLink(input: { scope: ShareLinkScope; candidateId?: number; expiresInDays: number; recipientEmail?: string }) {
		const created = await scrubinClient.huntAccess.createShareLink(this.huntId, input);
		this.lastCreatedUrl = created.url;
		await this.refresh();
		return created;
	}

	async revokeShareLink(linkId: number) {
		await scrubinClient.huntAccess.revokeShareLink(this.huntId, linkId);
		await this.refresh();
	}
}
