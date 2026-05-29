import type { CompanyUserRole, TeamInvite, TeamMember } from '$lib/scrubinClient';
import { scrubinClient } from '$lib/scrubinClient/client';

/**
 * Runes-backed state for the Team page (multi-user companies).
 * Owns the members + pending invites lists plus the mutation helpers. The
 * page component reads from these fields directly and the actions call
 * `refresh()` after each mutation so the table stays in sync.
 */
class TeamState {
	members = $state<TeamMember[]>([]);
	invites = $state<TeamInvite[]>([]);
	loading = $state(false);
	error = $state<string | null>(null);

	async refresh() {
		this.loading = true;
		this.error = null;
		try {
			const [members, invites] = await Promise.all([
				scrubinClient.team.listMembers(),
				scrubinClient.team.listInvites()
			]);
			this.members = members;
			this.invites = invites;
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Failed to load team';
		} finally {
			this.loading = false;
		}
	}

	async invite(email: string, role: CompanyUserRole) {
		await scrubinClient.team.createInvite(email, role);
		await this.refresh();
	}

	async resend(inviteId: number) {
		await scrubinClient.team.resendInvite(inviteId);
		await this.refresh();
	}

	async revoke(inviteId: number) {
		await scrubinClient.team.revokeInvite(inviteId);
		await this.refresh();
	}

	async changeRole(memberId: number, role: CompanyUserRole) {
		await scrubinClient.team.changeMemberRole(memberId, role);
		await this.refresh();
	}

	async remove(memberId: number) {
		await scrubinClient.team.removeMember(memberId);
		await this.refresh();
	}
}

export const teamState = new TeamState();
