# Launch Readiness

Original evaluation 2026-04-21; statuses updated 2026-07-20. **We are live** — first real paying customer onboarded 2026-07-20 (see [go-live-checklist.md](go-live-checklist.md) for the launch record and remaining hardening items).

## Verdict

**Core app is solid.** Multi-tenancy is enforced correctly, server actions are auth-first and parameterized, business logic works end-to-end. The P0 list below is done except where marked; remaining work is operational polish.

## P0 — must fix before first paid customer

### Security

- [x] **Consolidate schema** — Base `src/db/schema.sql` was missing columns added by separate migration scripts (`tickets.type`, `tickets.net_lbs`, `tickets.destination_id`, `invoices.share_token`, `invoices.price_per_unit`, `invoices.price_unit`). Fresh deploy would break. **Fixed 2026-04-21.**
- [x] **Quick Sale was un-permissioned** — `/sell` (`quickSale` action) created invoices without an `INVOICES_MANAGE` check. Any authenticated user in an org could issue invoices. **Fixed 2026-04-21.**
- [x] **Driver ticket list leaked cross-driver visibility** — drivers saw all org tickets. Now filtered to `driver_id = userId`. **Fixed 2026-04-21.**
- [x] **Share token hardening** — Added unique index on `share_token`, added `share_token_expires_at` nullable column for future expiry/rotation. Tokens are 256-bit random (strong) — leaving plaintext is acceptable given the risk model, but index + expiry path is in place. **Fixed 2026-04-21.**
- [x] **Rate limiting on public invoice route** — Upstash sliding window (20 req/min/IP) in middleware; graceful no-op until the Upstash env vars are set in Vercel (still pending). **Code shipped 2026-07-18.**
- [ ] **Schema-version tracking** — no table tracks which migrations have been applied. **This bit us on launch day (2026-07-20):** ad-hoc scripts had left prod `org_id` columns as `text` while `schema.sql` says `VARCHAR(255)`, and the mismatch broke all invoice creation (Postgres 42P08). A normalization block in `schema.sql` now heals that specific drift, but the class remains: adopt Drizzle or a `schema_migrations(name, applied_at)` table and stop using ad-hoc scripts. **TODO.**

### Correctness

- [x] **Wrap approval in a transaction** — `approveTicket` is transactional with a stock re-check under a per-(org, stack, location) advisory lock. **Fixed 2026-05-29.**
- [x] **Invoice-number race** — replaced with race-safe, monotonic per-org counter (`invoice_counters`, row-locked via ON CONFLICT). Numbers never reused after deletes. **Fixed 2026-05-29.**
- [x] **Stock check race** — ticket creation and approval serialize on `pg_advisory_xact_lock` per stock bin. **Fixed 2026-05-29.**

### UX / trust

- [x] **Onboarding flow** — help center, guided tours, and AI assistant shipped 2026-05-29.
- [ ] **Error boundaries + visible action errors** — unhandled server action errors still surface as Next.js's masked production message ("An error occurred in the Server Components render…"), which is what real users saw during the 2026-07-20 invoice bug. Two parts: add `error.tsx` per route group, and convert user-facing server actions to return `{ error: string }` instead of throwing, so validation/stock/subscription messages actually reach users in production. **TODO — highest-value UX item left.**
- [ ] **Loading states** — forms submit without affordance. Add pending spinners via `useFormStatus()`. **TODO.**
- [ ] **Empty states** — some pages render blank when there's no data. Every list should have a helpful empty state with a CTA.
- [ ] **Mobile polish pass** — app is responsive but some pages have cramped touch targets. Audit on a real phone.
- [ ] **Marketing landing page** — current signed-out view is a mini-landing. Needs a full landing site with value prop, features, pricing, screenshots, trust signals.
- [ ] **Branded identity** — was generic; now has Harvest brand system (see [design-identity.md](design-identity.md)). Apply across all pages.

### Operations

- [ ] **Audit log** — no record of who approved a ticket, changed an invoice status, deleted a stack. Add `audit_log(user_id, org_id, action, resource_type, resource_id, changes_json, created_at)` + helper. **TODO.**
- [ ] **Email transactional flow** — invoices are shared by link; there's no "Send Invoice" email action. Integrate Resend or Postmark. **TODO.**
- [ ] **Backups & restore runbook** — Neon has PITR but we haven't documented restore procedure. **TODO.**
- [x] **Monitoring / error tracking (code)** — Sentry instrumentation (server/edge/client) + `GET /api/health` shipped 2026-07-18. **Still pending:** set the DSN env vars in Vercel and point an uptime monitor at the health endpoint.
- [x] **Billing** — Clerk Billing (Stripe live) with two org plans: `hayflow_pro` $25/mo (≤2 users), `hayflow_pro_team` $100/mo (unlimited), 14-day trial with card upfront. Subscribers manage payment methods/invoices/cancellation at `/settings/organization` (Clerk `OrganizationProfile` Billing tab). **Live 2026-07-20.**

## P1 — first month after launch

- Tests. No coverage today. Vitest + Testing Library. Prioritize: server-action auth checks, approveTicket side effects, multi-org isolation.
- PDF export of invoices. Today the public invoice page has print CSS + a Print button, so customers can save-as-PDF from the browser — good enough for many. A *generated* PDF (downloadable file / email attachment) via `react-pdf` or Puppeteer-on-Vercel is the P1 ask.
- "Send Invoice" email. Not built — invoices are shared by copy-link only. Resend plumbing already exists in `src/lib/support.ts` (used for support escalations, gated on `RESEND_API_KEY`); the feature is a customer-facing template + send action + flip status to `sent`.
- CSV export of transactions / invoices for QuickBooks import. Not built.
- Reports — drilldowns, date range, top-customer / top-commodity views.
- ~~Dashboard drag-and-drop~~ — done: edit mode with drag-to-reorder and show/hide widgets shipped (`DashboardGrid.tsx`), persisted per user/org.

## P2 — scale / nice-to-have

- Multi-currency (if we sell internationally)
- Scale ticket integration (weigh-in-motion APIs)
- Driver mobile app (PWA install + offline draft)
- AI copilot for inventory forecasting
- Customer portal (view past invoices, request new orders)

## Known small rough edges

- `legacy_backup/` directory is dead weight — safe to delete.
- README.md is the Next.js boilerplate.
- `db.ts` warns on missing DATABASE_URL instead of failing — should throw in production.
- Hardcoded brand color overrides in a few JSX `style={{}}` blocks (status badges, etc.) — should reference CSS vars.
- `legacy_backup/` + `scripts/seed.js` haven't been opened — verify nothing is still referenced.
