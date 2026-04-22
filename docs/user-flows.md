# User Flows

## Driver flow (primary mobile user)

Drivers work in the field, typically on a phone, creating tickets as hay leaves a barn.

1. **Sign in** → landing page redirects to `/tickets` (via role check in `src/app/page.tsx`).
2. **Tickets list** — sees only tickets they created (post-2026-04-21). Tap → detail.
3. **New ticket** (`/tickets/new`):
   - Choose type (Sale / Barn-to-Barn)
   - Pick stack → pick source location → enter amount (bales)
   - Sale: enter customer + optional net_lbs (scale ticket weight)
   - B2B: pick destination location
   - Submit → status `pending`, redirected to list
4. **Detail view** — see their submission, status badge. If still `pending`, can delete their own.

Drivers CANNOT:
- See Home / Dashboard / Reports / Invoicing
- See other drivers' tickets
- Approve/reject tickets
- See prices, invoices, or financial data

## Admin / Bookkeeper flow

Operates from Home dashboard, manages inventory, approves tickets, sends invoices.

### Daily loop
1. **Dashboard** (`/`) — glance at total stock, sales this month, bales moved, recent activity.
2. **Approve tickets** (`/tickets`) — review pending driver tickets; approve (creates transactions) or reject.
3. **Build invoices** (`/dispatch`) — approved tickets queue; select customer's tickets, set price per ton or per bale, create invoice.
4. **Send invoice** (`/dispatch/invoices/[id]`) — copy public share link; send to customer via email/text; mark `sent`.
5. **Close the loop** — when customer pays, mark invoice `paid`.

### Occasional tasks
- **New stack** (`/stacks/new`) when a new commodity/lot comes in (name, commodity, bale size, weight/bale, base price).
- **New location** (`/locations/new`) when adding a barn.
- **Manual transaction** (`/inventory/new`) — production (baled today), purchase (bought in), adjustment (corrections).
- **Quick sale** (`/sell`) — one-click sale that creates ticket + transaction + invoice in one step (for walk-in buyers).

## Customer flow (public invoice view)

1. Bookkeeper shares a link: `https://hayflow.com/invoice/<32-byte-hex-token>`.
2. Customer clicks — no login. Sees invoice: header, line items (stack × bales × weight × amount), totals, pricing, notes.
3. Can print (browser print). No PDF download today.
4. Cannot edit or comment. No "approve" / "dispute" feedback loop yet.

## Admin-only: team & settings

- **Settings → Team** — invite members by email, assign role (admin/bookkeeper/driver), remove. Uses Clerk's org API.
- **Settings → Theme** — picks from 15 themes (dark + light variants). Persisted per-user via `user_preferences`.

## Onboarding (new org) — current state

1. Sign up via Clerk modal.
2. Clerk auto-creates a personal org.
3. User lands on dashboard (empty state).
4. No guided setup today. They must discover: create locations → create stacks → invite team → create tickets.

This is an obvious friction point — see [launch-readiness.md](launch-readiness.md) for the onboarding plan.
