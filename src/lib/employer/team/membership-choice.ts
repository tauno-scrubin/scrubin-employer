import type { CompanyPermissionLevel, CompanyUserRole } from '$lib/scrubinClient';

/**
 * The team page offers one flat pick where the backend stores two fields —
 * a company role and, for members, a permission level. Keeping the flattening
 * in one place stops the invite dialog, the change-role dialog and the members
 * table from disagreeing about what "full access" means.
 *
 * `owner` is deliberately absent: it is reserved for the founder and is neither
 * invitable nor assignable.
 */
export type MembershipChoice = 'admin' | 'manager-full' | 'manager-view';

export const MEMBERSHIP_CHOICES: { value: MembershipChoice; labelKey: string; hintKey: string }[] =
	[
		{
			value: 'admin',
			labelKey: 'team.membership.adminLabel',
			hintKey: 'team.membership.adminHint'
		},
		{
			value: 'manager-full',
			labelKey: 'team.membership.managerFullLabel',
			hintKey: 'team.membership.managerFullHint'
		},
		{
			value: 'manager-view',
			labelKey: 'team.membership.managerViewLabel',
			hintKey: 'team.membership.managerViewHint'
		}
	];

export function membershipFromChoice(choice: MembershipChoice): {
	role: CompanyUserRole;
	permissionLevel: CompanyPermissionLevel;
} {
	if (choice === 'admin') return { role: 'admin', permissionLevel: 'full' };
	return { role: 'manager', permissionLevel: choice === 'manager-full' ? 'full' : 'view' };
}

export function membershipToChoice(
	role: CompanyUserRole,
	permissionLevel: CompanyPermissionLevel | undefined
): MembershipChoice {
	if (role === 'admin' || role === 'owner') return 'admin';
	return permissionLevel === 'full' ? 'manager-full' : 'manager-view';
}
