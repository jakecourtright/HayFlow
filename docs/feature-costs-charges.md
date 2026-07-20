# Feature: Costs & Charges engine

Scoped 2026-07-20. Status: **approved direction, not yet built.** Sequenced ahead of the AI analyst (docs/launch-readiness P1/P2) because it creates the cost/margin data that makes the analyst compelling.

## Goal

Let users record what a lot **costs** (inputs against production) and what a sale **adds** beyond hay (delivery, fees, discounts) — so HayFlow can answer cost/ton, margin/ton, and lot profitability. Long-term this is the data layer for QuickBooks/ERP integration.

## The design constraint that rules everything

**As simple as today by default; complexity is opt-in, per lot, and earned.**

- **Level 0 (untouched):** the app looks exactly like today. The only footprint is one quiet, dotted-underline invitation per surface ("Track input costs on this lot", "Add charge or discount"). No new cards, no empty states, no onboarding nag.
- **Level 1 (first entry):** entering one cost makes a Costs card appear on that stack and adds a cost/ton stat. One charge on a sale adds a line to the totals box. Nothing else changes.
- **Level 2 (earned richness):** margin chips, category breakdown bars, and per-sale margin appear automatically once the data supports them. There is no "advanced mode" setting — depth is a consequence of usage, never a configuration.
- Adoption is **per lot / per sale**: track costs on premium Timothy, ignore them on grinder hay.

Mockups reviewed 2026-07-20 (chat session): stack page at levels 0/1/2; Quick Sale with charge row; public invoice with charge + discount line items.

## Data model (all additive — no changes to existing tables)

### `stack_costs`
| col | type | notes |
|---|---|---|
| id | SERIAL PK | |
| org_id | VARCHAR(255) NOT NULL | tenant scope |
| stack_id | INTEGER FK → stacks | ON DELETE CASCADE |
| category | VARCHAR(100) | free text w/ suggested defaults: Fertilizer, Seed, Chemicals, Water, Custom harvest, Trucking, Tarping, Land rent, Other |
| description | TEXT | optional |
| amount | DECIMAL(12,2) NOT NULL | **flat USD per entry (v1)** — no rate units yet |
| cost_date | DATE | defaults today |
| created_by, created_at | | attribution |

Derived (computed in queries, not stored):
- `cost_total(stack)` = SUM(amount)
- `cost_per_ton` = cost_total ÷ tons produced (production transactions × weight/bale ÷ 2000)
- `cost_per_bale` = cost_total ÷ bales produced
- `margin_per_ton` = avg realized sale $/ton − cost_per_ton (realized from sale transactions; fall back to base_price when no sales yet, labeled "vs list price")

Edge cases:
- No production yet → show "add production to see cost/ton", never divide by zero.
- Costs use the **average-cost model**: total costs ÷ total production, applied uniformly to sold bales. No FIFO/lot-splitting — hay lots are homogeneous; keep it simple.
- Purchased (not produced) stacks: purchase price already lives on the purchase transaction; `stack_costs` entries stack on top (freight, tarping) and cost basis = purchase line_total + costs.

### `invoice_charges`
| col | type | notes |
|---|---|---|
| id | SERIAL PK | |
| org_id | VARCHAR(255) NOT NULL | |
| invoice_id | INTEGER FK → invoices | ON DELETE CASCADE |
| label | VARCHAR(255) NOT NULL | "Delivery — 2 loads to Poulsbo" |
| amount | DECIMAL(12,2) NOT NULL | **negative allowed = discount** (renders green, "−$150.00") |
| created_at | | |

- `invoices.total_amount` = hay lines + SUM(charges). Recomputed on charge add/remove, same transaction.
- Public invoice renders charges as ordinary line items between hay lines and the total.

### `charge_types` (Phase 3 — the reusable catalog)
| col | type | notes |
|---|---|---|
| id | SERIAL PK | |
| org_id | VARCHAR(255) NOT NULL | |
| kind | VARCHAR(10) CHECK IN ('cost','charge') | one catalog, two uses |
| name | VARCHAR(100) | "Delivery" |
| default_amount | DECIMAL(12,2) | optional |
| rate_unit | VARCHAR(20) | 'flat' \| 'per_ton' \| 'per_bale' (v2 of rates lives here, NOT in v1 entry tables) |
| qb_account | VARCHAR(255) | **nullable now; the future QuickBooks mapping point** |
| archived_at | TIMESTAMP | soft delete |

## Where revenue reporting learns about charges (decision)

May 2026 made `transactions.line_total` the single source of truth for revenue. Charges are revenue but not inventory. **Decision: keep charges in `invoice_charges` and teach the revenue queries to add them** (dashboard money widgets, reports). Audit found 3 query sites. Rejected alternative: zero-bale `sale` transactions per charge — keeps queries untouched but pollutes the ledger and every stock/CSV surface forever.

## Permissions

- Stack costs: `INVENTORY_WRITE` (admin, bookkeeper).
- Invoice charges: `INVOICES_MANAGE` (admin, bookkeeper) — same gate as invoice editing.
- Drivers see neither (they already never see money surfaces).

## Phases

1. **A1 — Lot costs** (1–2 sessions): `stack_costs` + Costs card on stack detail + cost/ton stat + margin chip + category bars. Reports gain a "Profitability by stack" view.
2. **A2 — Sale charges** (1–2 sessions): `invoice_charges` + add-charge row in Quick Sale / invoice builder / invoice edit + public invoice line items + the 3 revenue-query updates.
3. **A3 — Catalogs** (1 session): `charge_types` manager in Settings; charge/cost pickers become type-ahead over the catalog with free-text fallback.
4. **A4 — QB/ERP bridge** (Large, unscoped): CSV export mapped to catalog accounts first; OAuth QuickBooks sync later. Catalog `qb_account` is the join point.

Build order note: all new forms use the structured-error pattern (`{ error }` returns, not throws) from day one; old actions retrofit opportunistically.

## Out of scope (v1)

- Rate-based cost entry ($/acre, $/ton) — flat dollars only; rates arrive with catalogs (A3).
- Allocating one cost across multiple stacks (e.g., a fertilizer bill split over 3 lots) — v2 candidate; workaround is manual split entries.
- FIFO/actual-lot costing, WIP accounting, depreciation — never; HayFlow is not an ERP, it feeds one.
- Charges on tickets (field-driver surface) — charges are an office/invoice concept.
