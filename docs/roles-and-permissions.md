# Roles & Permissions

Roles and permissions are defined in Clerk (per organization) and referenced by the constants in [`src/lib/permissions.ts`](../src/lib/permissions.ts).

## Roles

| Role | Key | Who | What they do |
|---|---|---|---|
| Admin | `org:admin` | Business owner | Everything: users, data, financials, settings |
| Bookkeeper | `org:bookkeeper` | Office / dispatcher | Manage tickets, invoices, inventory. Cannot manage users. |
| Driver | `org:driver` | Field / yard | Create their own tickets. View locations and stacks. Cannot see financials or invoices. |

## Permissions

Defined in Clerk dashboard; referenced as constants.

| Permission | Key | Granted to |
|---|---|---|
| Manage users | `org:users:manage` | admin |
| Delete stacks | `org:stacks:delete` | admin |
| Delete locations | `org:locations:delete` | admin |
| Create tickets | `org:tickets:create` | admin, bookkeeper, driver |
| Manage tickets (approve/reject) | `org:tickets:manage` | admin, bookkeeper |
| Manage invoices | `org:invoices:manage` | admin, bookkeeper |
| Write inventory (production/purchase/adjustment) | `org:inventory:write` | admin, bookkeeper |

Exact grants must match the Clerk dashboard; the constants are referenced but not enforced there.

## UI gating

`getPermissionFlags()` in `permissions.ts` returns a flat bag of booleans. Call it in server components and pass props down:

```ts
const flags = await getPermissionFlags();
<DashboardGrid canWriteInventory={flags.canWriteInventory} />
```

`RoleNav` branches on `isDriver` (hides Home, Invoicing, Reports) and on `canManageTickets` (hides Invoicing if not).

Drivers are redirected away from `/` to `/tickets` at page load (see `src/app/page.tsx`).

## Server-side enforcement

Permissions are the **real** authorization boundary. Every destructive or financial server action must `await requirePermission(...)` or inline `has({ permission })` check:

- `deleteLocation` → `LOCATIONS_DELETE`
- `deleteStack` → `STACKS_DELETE`
- `approveTicket`, `rejectTicket` → `TICKETS_MANAGE`
- `createInvoice`, `updateInvoice`, `updateInvoiceStatus`, `deleteInvoice` → `INVOICES_MANAGE`
- `quickSale` (creates ticket + tx + invoice) → `INVOICES_MANAGE` (added 2026-04-21)

UI hiding is not a substitute — never trust the client. Every new action must audit-check.

## Multi-org users

A single Clerk user can belong to multiple organizations. The active org is set via the Clerk `OrganizationSwitcher` / `UserButton`. Server actions read `orgId` from `auth()` — this reflects the active org cookie. If `orgId` is null, reject.

If you introduce user-level state (personal preferences, defaults), store in `user_preferences` keyed on `(user_id, org_id)` — keep it per-org scoped so switching orgs gives a fresh view.
