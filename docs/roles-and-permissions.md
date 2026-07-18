# Roles & Permissions

Roles are stored **in our Postgres database** (`org_member_roles`), not in Clerk — Clerk's custom role sets require the $100/mo B2B add-on, which we deliberately avoid. Clerk provides authN, sessions, and org membership; [`src/lib/permissions.ts`](../src/lib/permissions.ts) resolves each member's app role and derives permissions from an in-code matrix.

## Roles

| Role | Key | Who | What they do |
|---|---|---|---|
| Admin | `admin` | Business owner | Everything: users, data, financials, settings |
| Bookkeeper | `bookkeeper` | Office / dispatcher | Manage tickets, invoices, inventory. Cannot manage users. |
| Driver | `driver` | Field / yard | Create their own tickets. View locations and stacks. Cannot see financials or invoices. |

In Clerk, HayFlow admins hold Clerk's built-in `org:admin` (so they can manage org membership); bookkeepers and drivers are `org:member`.

## Permissions

Defined and enforced in `ROLE_PERMISSIONS` in `lib/permissions.ts` — the single source of truth.

| Permission | Key | Granted to |
|---|---|---|
| Manage users | `org:users:manage` | admin |
| Delete stacks | `org:stacks:delete` | admin |
| Delete locations | `org:locations:delete` | admin |
| Create tickets | `org:tickets:create` | admin, bookkeeper, driver |
| Manage tickets (approve/reject) | `org:tickets:manage` | admin, bookkeeper |
| Manage invoices | `org:invoices:manage` | admin, bookkeeper |
| Write inventory (production/purchase/adjustment) | `org:inventory:write` | admin, bookkeeper |

## Role resolution (`getRole()` in permissions.ts)

Per-request memoized. The first request for a member lazily migrates them into `org_member_roles`:

1. An explicit `org_member_roles` row always wins.
2. Else the role recorded when they were invited (`org_invited_roles`, keyed by email, consumed on first use).
3. Else their Clerk org-role claim — covers legacy members with old custom roles (`org:admin`/`org:bookkeeper`/`org:driver`) and org creators (Clerk gives creators `org:admin`).
4. Else `driver` (least privilege).

## Team management

The Team Management card (Settings) is `TeamManagement.tsx`, self-gated via `getTeamData()` — it renders nothing unless the server confirms `org:users:manage`. Invites, role changes, member removal, and invite revocation all run through server actions in `actions.ts` (`inviteTeamMember`, `setTeamMemberRole`, `removeTeamMember`, `revokeTeamInvitation`), which:

- record the invitee's intended role in `org_invited_roles` before sending the Clerk invitation;
- keep Clerk's built-in role in sync (`admin` ↔ `org:admin`, others `org:member`);
- refuse to demote the last admin or remove any admin.

## UI gating

`getPermissionFlags()` in `permissions.ts` returns a flat bag of booleans (one DB query). Call it in server components and pass props down:

```ts
const flags = await getPermissionFlags();
<DashboardGrid canWriteInventory={flags.canWriteInventory} />
```

Client components that need flags (e.g. the client-side settings page) call the read-only server action `getMyPermissionFlags()`.

`RoleNav` branches on `isDriver` (hides Home, Invoicing, Reports) and on `canManageTickets` (hides Invoicing if not).

Drivers are redirected away from `/` to `/tickets` at page load (see `src/app/page.tsx`).

## Server-side enforcement

Permissions are the **real** authorization boundary. Every destructive or financial server action must `await requirePermission(...)` or check `await checkPermission(...)`:

- `deleteLocation` → `LOCATIONS_DELETE`
- `deleteStack` → `STACKS_DELETE`
- `approveTicket`, `rejectTicket`, `transferInventory` → `TICKETS_MANAGE`
- `createInvoice`, `updateInvoice`, `updateInvoiceStatus`, `deleteInvoice` → `INVOICES_MANAGE`
- `quickSale` (creates ticket + tx + invoice) → `INVOICES_MANAGE` (added 2026-04-21)
- team actions → `USERS_MANAGE`

UI hiding is not a substitute — never trust the client. Every new action must audit-check.

## Multi-org users

A single Clerk user can belong to multiple organizations, with a separate `org_member_roles` row (and potentially different role) per org. The active org is set via the Clerk `OrganizationSwitcher` / `UserButton`. Server actions read `orgId` from `auth()` — this reflects the active org cookie. If `orgId` is null, reject.

If you introduce user-level state (personal preferences, defaults), store in `user_preferences` keyed on `(user_id, org_id)` — keep it per-org scoped so switching orgs gives a fresh view.
