# Team & roles (multi-user companies)

How the employer portal represents **who belongs to a company and what they can do**. The backend (`CompanyContextService` / `@HuntAccess` / `@MainAccountOnly`) is always the source of truth — everything here just hides or disables controls the user couldn't successfully use anyway.

## Two separate axes — don't conflate them

Roles live on **two different levels**:

1. **Company role** (`CompanyUserRole = 'owner' | 'admin' | 'manager'`) — company-wide, on `user.team.role`. `owner` + `admin` are **"main accounts"** (`user.team.isMainAccount === true`). `manager` is a **sub-user**.
2. **Per-hunt grant** (`HuntRole = 'collaborator' | 'viewer'`) — only applies to a **manager** sub-user, **per hunt**. A manager sees a hunt only if they've been granted access to it; the grant is either `collaborator` (read + write) or `viewer` (read-only).

So **"admin" and "collaborator" are not the same kind of thing**:

- An **admin** is a company-wide main account — sees _every_ hunt, manages the team, no per-hunt grants needed.
- A **collaborator** is a _manager_ who has been granted write access **to specific hunts only**.

The hunt detail endpoint returns the caller's **effective `huntRole`** for that hunt (main accounts always come back as `collaborator`); read it to gate per-hunt write controls.

## What each role can do (as gated in the UI)

| Capability                                                                                                 | Owner | Admin | Manager + `collaborator` (on that hunt) | Manager + `viewer` (on that hunt) |
| ---------------------------------------------------------------------------------------------------------- | :---: | :---: | :-------------------------------------: | :-------------------------------: |
| See **all** company hunts                                                                                  |  ✅   |  ✅   |           only granted hunts            |        only granted hunts         |
| Open a hunt they can reach (read)                                                                          |  ✅   |  ✅   |                   ✅                    |                ✅                 |
| Chat with candidates · change candidate status (accept/reject/offer) · notes · context answers · screening |  ✅   |  ✅   |                   ✅                    |          ❌ (read-only)           |
| **Hunt lifecycle** — activate / pause / complete / cancel / convert-to-ad                                  |  ✅   |  ✅   |                   ✅                    |                ❌                 |
| Create hunts · requirements wizard / chat                                                                  |  ✅   |  ✅   |                   ❌                    |                ❌                 |
| Manage team (invite / change role / remove) · grant per-hunt access / share links                          |  ✅   |  ✅   |                   ❌                    |                ❌                 |
| **Billing** (payment methods, plans)                                                                       |  ✅   |  ❌   |                   ❌                    |                ❌                 |

**Admin vs collaborator in one line:** an **admin** can do everything across the whole company _except billing_; a **collaborator** is limited to operational work (candidate actions, chat, and now the hunt lifecycle) on the **specific hunts shared with them** — and cannot create hunts, manage the team, or touch billing.

> Billing is **owner-only** in the UI (`canManageBilling` checks `role === 'owner'`), even though admins are main accounts for everything else. Keep that distinction if you add billing surfaces.

## Use the helpers, don't hand-roll role checks

All gating goes through [`$lib/permissions.ts`](../../permissions.ts) — never compare `user.team.role` strings inline in components:

```ts
import {
	isMainAccount,
	canManageTeam,
	canManageBilling,
	canCreateHunts,
	canManageHuntAccess,
	canWriteOnHunt
} from '$lib/permissions';

if (canCreateHunts(user)) {
	/* show "New hunt" */
}
if (canWriteOnHunt(user, hunt.huntRole)) {
	/* enable candidate actions / lifecycle buttons */
}
```

- `isMainAccount` / `canManageTeam` / `canCreateHunts` / `canManageHuntAccess` → owner **or** admin.
- `canManageBilling` → owner only.
- `canWriteOnHunt(user, huntRole)` → main account, **or** a `collaborator` grant on that hunt (viewers get read-only).
- **Legacy / single-user fallback:** when `user.team` is `null` (flag off or pre-backfill), every helper treats the user as a main account — same as before multi-user existed.

## Slice layout

- **State:** [`team-state.svelte.ts`](./team-state.svelte.ts) — runes-backed; owns `members` + pending `invites` and the mutation helpers, calls `refresh()` after each change. Per-hunt grants have their own state in [`../hunt-access/hunt-access-state.svelte.ts`](../hunt-access/hunt-access-state.svelte.ts).
- **Components:** `InviteMemberDialog`, `ChangeMemberRoleDialog` (admin/manager only — `owner` is reserved for the founder), `MemberHuntAccessDialog` (manage a **manager's** per-hunt grants — not shown for admins, who already see every hunt). The per-hunt "Shared with" UI lives in `../hunt-access/` (`SharedWithPanel`, `AddTeammateDialog`) and lists owners/admins informationally plus grantable managers.
- **Notifications:** When a hunt has collaborator assignees, system emails go to those collaborators by default. Owners/admins opt in per hunt via the Notifications bell (each main account configures only their own). See care-backend team README § Notification routing.
- **Data:** `scrubinClient.team.*` (`listMembers`, `listInvites`, `createInvite`, `resendInvite`, `changeMemberRole`, …) and `scrubinClient.huntAccess.*` for per-hunt grants. Page: `routes/(logged_in)/dashboard/settings/team/`.

## Gotchas

- The UI gate is **cosmetic** — the backend re-checks every request (`@HuntAccess({ requireCollaborator })` on writes, `@MainAccountOnly()` on team/billing/requirements). Don't rely on hiding a button for security.
- A manager with **no grant** on a hunt gets `404` from the API (the hunt is invisible to them), not `403`. A `viewer` attempting a write gets `403`.
- `huntRole` is **per hunt** — load it from the hunt detail response for the hunt in view; don't assume a manager has the same role across hunts.
