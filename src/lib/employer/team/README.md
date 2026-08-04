# Team & roles (multi-user companies)

How the employer portal represents **who belongs to a company and what they can do**. The backend (`CompanyContextService` / `@HuntAccess` / `@MainAccountOnly`) is always the source of truth — everything here just hides or disables controls the user couldn't successfully use anyway.

## Three separate axes — don't conflate them

Permissions live on **three different levels**:

1. **Company role** (`CompanyUserRole = 'owner' | 'admin' | 'manager'`) — company-wide, on `user.team.role`. `owner` + `admin` are **"main accounts"** (`user.team.isMainAccount === true`). `manager` is a **sub-user**.
2. **Permission level** (`CompanyPermissionLevel = 'view' | 'full'`) — company-wide, on `user.team.permissionLevel`. Only meaningful for a `manager`; main accounts are always effectively `full`. Decides whether they may **edit hunts and create new ones**.
3. **Per-hunt grant** (`HuntRole = 'collaborator' | 'viewer'`) — per hunt, for a manager. A manager sees a hunt only if they've been granted access to it; the grant is either `collaborator` (can act) or `viewer` (read-only).

So **"admin", "full" and "collaborator" are three different kinds of thing**:

- An **admin** is a company-wide main account — sees _every_ hunt, manages the team, no per-hunt grants needed.
- A **full** member is still a sub-user: they see only the hunts shared with them, but on those they can edit the requirements and the ad, and they can create brand-new hunts.
- A **collaborator** is the per-hunt grant that says "may act on this hunt".

Editing a hunt needs **both** axes 2 and 3 — `full` + `viewer` on a hunt is still read-only. That combination is exactly what `canEditHuntDetails(user, huntRole)` encodes.

The hunt detail endpoint returns the caller's **effective `huntRole`** for that hunt (main accounts always come back as `collaborator`); read it to gate per-hunt write controls.

## What each role can do (as gated in the UI)

`M+c` = manager holding a `collaborator` grant on that hunt, `M+v` = `viewer` grant.

| Capability                                                                                                 | Owner | Admin | full, M+c | full, M+v | view, M+c | view, M+v |
| ---------------------------------------------------------------------------------------------------------- | :---: | :---: | :-------: | :-------: | :-------: | :-------: |
| See **all** company hunts                                                                                  |  ✅   |  ✅   | granted only | granted only | granted only | granted only |
| Open a hunt they can reach (read)                                                                          |  ✅   |  ✅   |    ✅     |    ✅     |    ✅     |    ✅     |
| Chat with candidates · change candidate status · notes · context answers · screening                       |  ✅   |  ✅   |    ✅     |    ❌     |    ✅     |    ❌     |
| **Hunt lifecycle** — activate / pause / complete / cancel                                                  |  ✅   |  ✅   |    ✅     |    ❌     |    ✅     |    ❌     |
| **Edit hunt requirements** · publish as public job ad                                                      |  ✅   |  ✅   |    ✅     |    ❌     |    ❌     |    ❌     |
| Create hunts · requirements wizard / chat · see drafts                                                     |  ✅   |  ✅   |    ✅     |    ✅     |    ❌     |    ❌     |
| Manage team (invite / change role / remove) · grant per-hunt access / share links                          |  ✅   |  ✅   |    ❌     |    ❌     |    ❌     |    ❌     |
| **Billing** (payment methods, plans)                                                                       |  ✅   |  ❌   |    ❌     |    ❌     |    ❌     |    ❌     |

**In one line each:** an **admin** does everything company-wide _except billing_; a **full member** runs the hunts shared with them end-to-end and can start new ones, but never touches the team or the money; a **view member** does the operational candidate work only.

Note "create hunts" doesn't depend on the per-hunt grant — it's company-wide. A hunt a member creates auto-grants them `collaborator` on it, so it shows up in their list immediately.

> Billing is **owner-only** in the UI (`canManageBilling` checks `role === 'owner'`), even though admins are main accounts for everything else. Keep that distinction if you add billing surfaces.

## Use the helpers, don't hand-roll role checks

All gating goes through [`$lib/permissions.ts`](../../permissions.ts) — never compare `user.team.role` strings inline in components:

```ts
import {
	isMainAccount,
	hasFullAccess,
	canManageTeam,
	canManageBilling,
	canCreateHunts,
	canManageHuntAccess,
	canWriteOnHunt,
	canEditHuntDetails
} from '$lib/permissions';

if (canCreateHunts(user)) {
	/* show "New hunt" */
}
if (canWriteOnHunt(user, hunt.huntRole)) {
	/* enable candidate actions / lifecycle buttons */
}
if (canEditHuntDetails(user, hunt.huntRole)) {
	/* enable the requirement edit pencils, "Make ad public" */
}
```

- `isMainAccount` / `canManageTeam` / `canManageHuntAccess` → owner **or** admin.
- `canManageBilling` → owner only.
- `hasFullAccess` / `canCreateHunts` → main account, **or** a manager on the `full` permission level.
- `canWriteOnHunt(user, huntRole)` → main account, **or** a `collaborator` grant on that hunt (viewers get read-only).
- `canEditHuntDetails(user, huntRole)` → `hasFullAccess` **and** `canWriteOnHunt`. Use this for anything that changes the hunt itself rather than its candidates.
- **Legacy / single-user fallback:** when `user.team` is `null` (flag off or pre-backfill), every helper treats the user as a main account — same as before multi-user existed.

## Slice layout

- **State:** [`team-state.svelte.ts`](./team-state.svelte.ts) — runes-backed; owns `members` + pending `invites` and the mutation helpers, calls `refresh()` after each change. Per-hunt grants have their own state in [`../hunt-access/hunt-access-state.svelte.ts`](../hunt-access/hunt-access-state.svelte.ts).
- **Role picker:** [`membership-choice.ts`](./membership-choice.ts) flattens the (role, permissionLevel) pair into the three options the UI offers — **Admin**, **Member — full access**, **Member — view only** — and back again. The invite dialog, the change-role dialog and the members-table badge all go through it; don't hand-roll the mapping in a component.
- **Components:** `InviteMemberDialog`, `ChangeMemberRoleDialog` (both render `MEMBERSHIP_CHOICES` — `owner` is reserved for the founder), `MemberHuntAccessDialog` (manage a **manager's** per-hunt grants — not shown for admins, who already see every hunt). The per-hunt "Shared with" UI lives in `../hunt-access/` (`SharedWithPanel`, `AddTeammateDialog`) and lists owners/admins informationally plus grantable managers.
- **Wizard guard:** [`../hunt-wizard-guard.ts`](../hunt-wizard-guard.ts) — the four create-hunt routes are reachable by URL, so each calls `guardHuntWizard()` in `onMount` to bounce a view-only member back to the dashboard.
- **Notifications:** When a hunt has collaborator assignees, system emails go to those collaborators by default. Owners/admins opt in per hunt via the Notifications bell (each main account configures only their own). See care-backend team README § Notification routing.
- **Data:** `scrubinClient.team.*` (`listMembers`, `listInvites`, `createInvite`, `resendInvite`, `changeMemberRole`, …) and `scrubinClient.huntAccess.*` for per-hunt grants. Page: `routes/(logged_in)/dashboard/settings/team/`.

## Gotchas

- The UI gate is **cosmetic** — the backend re-checks every request (`@HuntAccess({ requireCollaborator })` on hunt writes, `@CanManageHunts()` + `assertRequirementAccess` on requirements, `@MainAccountOnly()` on team/billing/sharing). Don't rely on hiding a button for security.
- **`permissionLevel` on an owner/admin is not meaningful** — the backend forces it to `full` but every check short-circuits on `isMainAccount` first. Always go through `hasFullAccess`, never compare `user.team.permissionLevel` inline.
- **Upgrading a member to full doesn't give them more hunts.** Visibility is still the per-hunt grant. "I made them full but they see nothing" means they need a grant from the hunt's Team tab.
- A manager with **no grant** on a hunt gets `404` from the API (the hunt is invisible to them), not `403`. A `viewer` attempting a write gets `403`.
- `huntRole` is **per hunt** — load it from the hunt detail response for the hunt in view; don't assume a manager has the same role across hunts.
