# Data Model

Canonical source: [`src/db/schema.sql`](../src/db/schema.sql).

## Tenancy

Every core table carries `org_id VARCHAR(255) NOT NULL` (Clerk Organization ID). This is the **only** tenant boundary. Every read and write must scope with `WHERE org_id = $n`.

`user_id VARCHAR(255)` (Clerk User ID) is also stored on rows for attribution — but it is NOT the tenant boundary.

## Units

- **Amount:** stored in bales (`DECIMAL`). Always. Conversions happen at the edges via `src/lib/units.ts`.
- **Price:** stored as `$/ton` (`DECIMAL`). Form inputs may be `$/bale` or `$/ton`; `normalizePrice()` converts before insert.
- **Weight:** `stacks.weight_per_bale` in lbs. Falls back to `getDefaultWeight(bale_size)` when null.

## Tables

### `locations`
Barns / storage facilities.
- `id SERIAL PK`, `name`, `capacity INTEGER`, `unit` (`bales`|`tons`), `capacity_unit`
- `user_id`, `org_id`, `created_at`
- Deletion blocked if any `transactions.location_id = this.id` exist (see `deleteLocation` action).

### `stacks`
A product / lot number (e.g., "Alfalfa Lot 42, 3x4 Premium").
- `id SERIAL PK`, `name`, `commodity`, `bale_size` (`3x3`|`3x4`|`4x4`|`2-Tie`|`3-Tie`), `quality`
- `base_price DECIMAL(10,2)`, `weight_per_bale INTEGER`, `price_unit` (`bale`|`ton`)
- `user_id`, `org_id`, `created_at`

### `transactions`
The inventory ledger. Positive for `production`/`purchase`, negative (computed in SQL) for `sale`. `adjustment` is free-form.
- `id SERIAL PK`, `date TIMESTAMP`, `type` (`production`|`purchase`|`sale`|`adjustment`)
- `stack_id FK`, `location_id FK`, `amount DECIMAL(10,2)`, `unit` (always `bales`)
- `entity VARCHAR` (buyer or seller), `price DECIMAL(10,2)` (always `$/ton` normalized)
- `user_id`, `org_id`
- **Current stock at (stack, location) =** `SUM(CASE WHEN type IN ('production','purchase') THEN amount WHEN type='sale' THEN -amount ELSE 0 END)`.
- `adjustment` type is included as `else 0` in stock math today — interpreted as free-text note only. If we want true adjustments, extend this formula.

### `tickets`
Driver-created removal request. Two types today:
- `type='sale'` — hay leaving for a customer. Requires `customer`, optional `net_lbs`.
- `type='barn_to_barn'` — transfer between locations. Requires `destination_id`.
- `id`, `stack_id FK`, `location_id FK` (source), `destination_id FK` (b2b only)
- `amount DECIMAL` (bales), `net_lbs DECIMAL` (optional, weighed at scale)
- `customer`, `notes`, `status` (`pending`|`approved`|`rejected`|`invoiced`)
- `invoice_id FK`, `transaction_id FK` (set on approval)
- `driver_id VARCHAR` (Clerk user ID), `org_id`, timestamps

Approval side effects (`approveTicket`):
- **Sale:** inserts 1 `sale` transaction (deducts inventory at source).
- **Barn-to-barn:** inserts a `sale` at source + `purchase` at destination (net-zero across org).

### `invoices`
Bookkeeper-compiled invoice of one or more `approved` tickets.
- `id`, `invoice_number VARCHAR(100)` (format: `INV-0001`, org-scoped serial)
- `customer`, `status` (`draft`|`sent`|`paid`), `total_amount DECIMAL(12,2)`
- `price_per_unit DECIMAL(10,2)`, `price_unit` (`bale`|`ton`), `notes`
- `share_token VARCHAR(64)` (hex-encoded 32 random bytes — 256-bit entropy)
- `created_by`, `org_id`, timestamps

On creation, tickets are bulk-updated to `status='invoiced'` and linked via `invoice_id`. On delete, tickets revert to `status='approved'`.

### `user_preferences`
JSONB preferences per user per org.
- Key used today: `dashboard_layout` (order + hidden widgets)
- `UNIQUE (user_id, org_id, preference_key)`

## Indexes

All `org_id` columns indexed. `tickets` also indexed on `status`, `driver_id`, `invoice_id`. `invoices` on `status`, `share_token`. `transactions` has composite `(stack_id, location_id)` for stock lookups.

## Invariants & gotchas

- **Stock check runs on write**, not in a constraint. `createTicket` + `submitTransaction` both pre-check inventory. Multi-request race is possible (two drivers creating tickets simultaneously) — unlikely in practice but a known gap. Fix later with `SELECT ... FOR UPDATE` in a transaction.
- **Ticket approval mutates inventory** via separate `INSERT INTO transactions`. There's no wrap-in-transaction block; a failure between the insert and the `tickets.status` update would leave orphan transactions. Low risk today but worth tightening before scale.
- **`invoice_number` is count+1** per org. Two concurrent invoice creations could produce duplicates. Replace with a per-org sequence when it matters.
- **No audit log.** Status changes aren't tracked.

See [launch-readiness.md](launch-readiness.md) for prioritized fixes.
