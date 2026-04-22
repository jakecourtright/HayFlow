# HayFlow — Claude Context

Modern inventory and invoicing SaaS for hay/forage growers and dealers. Built with Next.js 16 App Router, Clerk (orgs + roles), and Neon Postgres (raw SQL, no ORM).

## Mental model — the business

A **grower** stores hay in **Locations** (barns). Each hay lot is a **Stack** (commodity, bale size, quality, price, weight/bale). Inventory movements are **Transactions** (`production`, `purchase`, `sale`, `adjustment`). Field drivers create **Tickets** (Sale or Barn-to-Barn transfer) when bales leave a barn; admins/bookkeepers approve → bookkeepers bundle approved tickets into **Invoices** → invoice gets a public share link sent to the customer.

Canonical units: **bales** for amounts, **$/ton** for price (normalized on write).

## Directory layout

```
src/
  app/
    actions.ts          # ALL server actions (single-file) — auth + orgId + permission gate
    layout.tsx          # ClerkProvider, global theme, header, RoleNav
    page.tsx            # signed-out hero + signed-in dashboard (redirects drivers to /tickets)
    globals.css         # Tailwind v4 + theme tokens + component utilities
    contexts/           # Theme context
    dashboard/          # DashboardGrid (customizable widget layout)
    tickets/            # list, new, [id] detail
    dispatch/           # approved-ticket queue + invoices/[id]
    invoice/[token]/    # PUBLIC invoice share page (no auth)
    sell/               # Quick Sale (one-step ticket→tx→invoice)
    settings/           # theme picker, team management
    stacks/ locations/ inventory/ transactions/ reports/ log/
  components/
    RoleNav.tsx         # bottom nav (driver vs admin/bookkeeper)
    CustomSelect.tsx UnitSelect.tsx TeamManagement.tsx
  lib/
    db.ts               # Neon pool (WebSocket)
    permissions.ts      # Permissions + Roles constants; checkPermission/requirePermission
    units.ts            # tons<->bales, normalizePrice
  db/
    schema.sql          # consolidated schema (source of truth)
  middleware.ts         # clerkMiddleware — protects /log, /locations, /stacks, /inventory,
                        # /reports, /settings, /tickets, /dispatch, /sell
scripts/                # one-off migration scripts (ad hoc, no tracking)
docs/                   # project knowledge (read these for deeper context)
public/
```

## Non-obvious conventions

- **No ORM.** Raw SQL via `@neondatabase/serverless` Pool. Always acquire with `await pool.connect()` then `finally { client.release(); }`. Always parameterize (`$1, $2`).
- **Every server action** starts with `const { userId, orgId } = await auth(); if (!userId || !orgId) throw new Error("Unauthorized");` and scopes writes with `WHERE org_id = $n`.
- **Mutations are server actions, not API routes.** Clerk middleware handles CSRF via cookies. Prefer this pattern.
- **Amounts store in bales, prices store in $/ton.** UI can show bales or tons; `lib/units.ts` handles conversion.
- **Role UI gating** lives in `lib/permissions.ts` via `getPermissionFlags()` — call from server components, pass booleans to client components.
- **Drivers redirect to `/tickets`** at the root (`src/app/page.tsx`). They never see dashboard/reports/invoicing.
- **Public invoice route** (`/invoice/[token]`) is intentionally unprotected. Access is via unguessable 256-bit share token.

## Working style here

- Follow existing patterns — don't introduce an ORM, don't add API routes when a server action works, don't add feature flags.
- Keep server actions auth-first, org-scoped, parameterized.
- Match the existing utility classes (`glass-card`, `btn btn-primary`, `input-modern`, `select-modern`, `label-modern`) rather than reinventing.
- Theme via CSS variables (`var(--primary)` etc.) — never hardcode colors.

## Deeper reference

- [docs/architecture.md](docs/architecture.md) — stack, deployment, routing
- [docs/data-model.md](docs/data-model.md) — every table, relationships, invariants
- [docs/roles-and-permissions.md](docs/roles-and-permissions.md) — Clerk roles, permission matrix
- [docs/user-flows.md](docs/user-flows.md) — driver, bookkeeper, admin, customer flows
- [docs/launch-readiness.md](docs/launch-readiness.md) — what's left before paying customers
- [docs/design-identity.md](docs/design-identity.md) — brand, palette, type, voice

## Quick commands

- `npm run dev` — local dev (needs `.env.local` with `DATABASE_URL`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`)
- `npm run build` — prod build
- `npm run migrate` — apply `src/db/schema.sql` against `DATABASE_URL` (idempotent — uses `IF NOT EXISTS`)
