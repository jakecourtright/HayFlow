# Data Model

Canonical source: [`src/db/schema.sql`](../src/db/schema.sql). Statuses current as of 2026-07-20.

## Tenancy

Every core table carries `org_id VARCHAR(255) NOT NULL` (Clerk Organization ID). This is the **only** tenant boundary. Every read and write must scope with `WHERE org_id = $n`.

`user_id VARCHAR(255)` (Clerk User ID) is also stored on rows for attribution — but it is NOT the tenant boundary.

**Type discipline:** all `org_id`/`user_id` columns are `VARCHAR(255)`. A normalization block in `schema.sql` converts any `text`-typed stragglers (left by legacy ad-hoc scripts) — mixed types broke production invoice creation on 2026-07-20 (Postgres 42P08). Never reuse one SQL placeholder across `org_id` columns of two different tables; bind the value once per usage.

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
- `archived_at TIMESTAMP` — soft delete: NULL = active; set = hidden from active lists/pickers, history kept
- `user_id`, `org_id`, `created_at`

### `transactions`
The inventory ledger and the **single source of truth for revenue**.
- `id SERIAL PK`, `date TIMESTAMP`, `type` (`production`|`purchase`|`sale`|`adjustment`|`transfer_in`|`transfer_out`)
- `date` is the business date. Ticket-driven rows (sale, transfer legs) are stamped with the **ticket's created_at** — when the bales left the barn — never the approval/invoice time, so late approvals can't shift revenue into the wrong month.
- `transfer_in`/`transfer_out` are the paired legs of a barn-to-barn move (price 0); excluded from sales/purchase reports
- `stack_id FK`, `location_id FK`, `amount DECIMAL(10,2)`, `unit` (always `bales`)
- `entity VARCHAR` (buyer or seller), `price DECIMAL(10,2)` (always `$/ton` normalized)
- `line_total DECIMAL(12,2)` — actual USD for the line: revenue (sale) / cost (purchase, production — reports count both in Cost/Net P&L); 0 for adjustment/transfer. Per-ton sale lines without a scale weight estimate dollars from bales × the stack's weight/bale (`lineAmount` fallback) — a priced line is never $0.
- `user_id`, `org_id`
- **Current stock at (stack, location) =** `SUM(CASE WHEN type IN ('production','purchase','transfer_in','adjustment') THEN amount WHEN type IN ('sale','transfer_out') THEN -amount ELSE 0 END)`.
- `adjustment` is a **signed delta** counted in all stock math (2026-08-04): the form takes a positive count + Add/Remove direction; "remove" stores a negative `amount`. Cutover was forward-only — the 3 pre-launch adjustment rows were zeroed (original amounts preserved in `entity`) via `scripts/neutralize-legacy-adjustments.js`.

### `tickets`
Driver-created removal request. Two types:
- `type='sale'` — hay leaving for a customer. Requires `customer`, optional `net_lbs`.
- `type='barn_to_barn'` — transfer between locations. Requires `destination_id`.
- `id`, `stack_id FK`, `location_id FK` (source), `destination_id FK` (b2b only)
- `amount DECIMAL` (bales), `net_lbs DECIMAL(12,2)` (optional, weighed at scale)
- `price_per_unit DECIMAL(10,2)`, `price_unit` (`bale`|`ton`) — per-line rate for multi-item Quick Sale; NULL = use the invoice-level rate
- `customer`, `notes`, `status` (`pending`|`approved`|`rejected`|`invoiced`)
- `invoice_id FK`, `transaction_id FK` (set on approval)
- `driver_id VARCHAR` (Clerk user ID), `org_id`, timestamps

Approval side effects (`approveTicket`, transactional, stock re-checked under a per-(org, stack, location) advisory lock):
- **Sale:** inserts 1 `sale` transaction (deducts inventory at source).
- **Barn-to-barn:** inserts `transfer_out` at source + `transfer_in` at destination (net-zero across org).

### `invoices`
Bookkeeper-compiled invoice of one or more `approved` tickets (or created directly by Quick Sale).
- `id`, `invoice_number VARCHAR(100)` (format: `INV-0001`, from `invoice_counters` — race-safe, monotonic per org)
- `customer`, `status` (`draft`|`sent`|`paid`), `total_amount DECIMAL(12,2)`
- `price_per_unit DECIMAL(10,2)`, `price_unit` (`bale`|`ton`), `notes`
- `share_token VARCHAR(128)` (hex-encoded 32 random bytes — 256-bit entropy), `share_token_expires_at` (nullable; NULL = no expiry)
- `created_by`, `org_id`, timestamps

On creation, tickets are bulk-updated to `status='invoiced'` and linked via `invoice_id`. On delete, ticket-based invoices revert tickets to `status='approved'`; Quick Sale invoices reverse their sale transactions (inventory returns).

### `invoice_counters`
Per-org monotonic invoice-number counter.
- `org_id VARCHAR(255) PK`, `last_number INTEGER`
- Seeded from existing invoices on first use; incremented atomically (`ON CONFLICT` row lock serializes concurrent callers). Numbers never reused after deletion. Must be called inside the invoice-creating transaction.

### `business_profiles`
One per org — the "From" block rendered on invoices.
- `org_id UNIQUE`, `name`, address fields, `phone`, `email`, `payment_instructions TEXT`, `updated_at`, `updated_by`

### `org_billing`
Local mirror for trial-countdown UX. **Clerk Billing is the source of truth for access** (`auth().has({ plan })`).
- `org_id PK`, `trial_started_at` (NULL until we first observe an active subscription, then stamped once — race-safe), `trial_days` (14), `grace_days` (7)

### `org_member_roles`
App-level role per org member — **roles live here, not in Clerk** (avoids Clerk's custom-roles add-on; moved 2026-07-18).
- `(org_id, user_id) PK`, `role` CHECK (`admin`|`bookkeeper`|`driver`), timestamps
- Resolution order (`lib/permissions.ts`): explicit row → invited role (`org_invited_roles`, consumed on first resolve) → Clerk org-role claim (org creators are `org:admin` → `admin`) → `driver` (least privilege). First resolve lazily inserts the row.

### `org_invited_roles`
Role recorded at invite time, keyed by email; deleted when consumed.
- `(org_id, email) PK`, `role` CHECK (`admin`|`bookkeeper`|`driver`), `created_at`

### `support_requests`
Help-assistant "Reach the team" escalations — persisted so a request survives a failed email send.
- `id`, `org_id`, `user_id`, `user_name`, `user_email`, `reply_to`, `message`, `transcript JSONB`, `page`, `status` (default `open`), `emailed BOOLEAN`, `created_at`

### `user_preferences`
JSONB preferences per user per org.
- Keys used today: `dashboard_layout` (order + hidden widgets), `completed_tours`
- `UNIQUE (user_id, org_id, preference_key)`

## Indexes

All `org_id` columns indexed. `tickets` also indexed on `status`, `driver_id`, `invoice_id`. `invoices` on `status`, unique partial on `share_token`. `transactions` has composite `(stack_id, location_id)` for stock lookups. `org_billing` on `trial_started_at`; `support_requests` on `(org_id, created_at)` and `(status, created_at)`.

## Invariants & gotchas

- **Stock checks are race-safe** (since 2026-05-29): ticket creation and approval serialize on `pg_advisory_xact_lock` per (org, stack, location) bin inside a transaction, with a re-check before write. Quick Sale aggregates duplicate lines before its check so multi-line sales can't oversell a bin.
- **Invoice numbers are race- and deletion-safe** via `invoice_counters` (see above). The old `COUNT(*)+1` scheme is gone.
- **Thrown server-action errors are invisible in production** — Next.js masks the message. Until actions return structured `{ error }` results, users see a generic banner for stock/validation/subscription failures (see [launch-readiness.md](launch-readiness.md)).
- **No audit log.** Status changes aren't tracked.

See [launch-readiness.md](launch-readiness.md) for prioritized fixes and [go-live-checklist.md](go-live-checklist.md) for launch status.
