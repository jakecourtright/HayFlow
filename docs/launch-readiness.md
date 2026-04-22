# Launch Readiness

Evaluation dated 2026-04-21. Goal: what has to be true before we take paying customers.

## Verdict

**Core app is solid.** Multi-tenancy is enforced correctly, server actions are auth-first and parameterized, business logic works end-to-end. The blockers are operational polish and a handful of security/UX gaps.

## P0 — must fix before first paid customer

### Security

- [x] **Consolidate schema** — Base `src/db/schema.sql` was missing columns added by separate migration scripts (`tickets.type`, `tickets.net_lbs`, `tickets.destination_id`, `invoices.share_token`, `invoices.price_per_unit`, `invoices.price_unit`). Fresh deploy would break. **Fixed 2026-04-21.**
- [x] **Quick Sale was un-permissioned** — `/sell` (`quickSale` action) created invoices without an `INVOICES_MANAGE` check. Any authenticated user in an org could issue invoices. **Fixed 2026-04-21.**
- [x] **Driver ticket list leaked cross-driver visibility** — drivers saw all org tickets. Now filtered to `driver_id = userId`. **Fixed 2026-04-21.**
- [x] **Share token hardening** — Added unique index on `share_token`, added `share_token_expires_at` nullable column for future expiry/rotation. Tokens are 256-bit random (strong) — leaving plaintext is acceptable given the risk model, but index + expiry path is in place. **Fixed 2026-04-21.**
- [ ] **Rate limiting on public invoice route** — `/invoice/[token]` is unauthenticated; no brute-force protection. Use Vercel Edge middleware or Upstash Ratelimit (e.g., 20 req/min/IP). **TODO.**
- [ ] **Schema-version tracking** — no table tracks which migrations have been applied; production drift is possible. Either adopt Drizzle + migrations or add a simple `schema_migrations(name, applied_at)` table and stop using ad-hoc scripts. **TODO.**

### Correctness

- [ ] **Wrap approval in a transaction** — `approveTicket` does a multi-step insert (transaction + ticket update). A mid-flight failure leaves orphans. Wrap in `BEGIN/COMMIT`. **TODO.**
- [ ] **Invoice-number race** — `INV-count+1` can duplicate on concurrent creation. Replace with a per-org Postgres sequence or `MAX(id)+1` inside the transaction. **TODO.**
- [ ] **Stock check race** — two drivers creating tickets from the same location at the same time can both pass the pre-check. Guard with `SELECT ... FOR UPDATE` in a transaction. **TODO.**

### UX / trust

- [ ] **Onboarding flow** — brand-new orgs see an empty dashboard and must intuit the setup order (locations → stacks → tickets). Add a first-run checklist / wizard. **TODO.**
- [ ] **Error boundaries** — unhandled server action errors throw into a default 500 page. Add `error.tsx` per top-level route group. **TODO.**
- [ ] **Loading states** — forms submit without affordance. Add pending spinners via `useFormStatus()`. **TODO.**
- [ ] **Empty states** — some pages render blank when there's no data. Every list should have a helpful empty state with a CTA.
- [ ] **Mobile polish pass** — app is responsive but some pages have cramped touch targets. Audit on a real phone.
- [ ] **Marketing landing page** — current signed-out view is a mini-landing. Needs a full landing site with value prop, features, pricing, screenshots, trust signals.
- [ ] **Branded identity** — was generic; now has Harvest brand system (see [design-identity.md](design-identity.md)). Apply across all pages.

### Operations

- [ ] **Audit log** — no record of who approved a ticket, changed an invoice status, deleted a stack. Add `audit_log(user_id, org_id, action, resource_type, resource_id, changes_json, created_at)` + helper. **TODO.**
- [ ] **Email transactional flow** — invoices are shared by link; there's no "Send Invoice" email action. Integrate Resend or Postmark. **TODO.**
- [ ] **Backups & restore runbook** — Neon has PITR but we haven't documented restore procedure. **TODO.**
- [ ] **Monitoring / error tracking** — no Sentry, no uptime pings. At minimum add Vercel's built-in analytics + Sentry free tier. **TODO.**
- [ ] **Billing** — no subscription tier. Decide plan structure (seats? orgs? usage?) and integrate Stripe. **TODO.**

## P1 — first month after launch

- Tests. No coverage today. Vitest + Testing Library. Prioritize: server-action auth checks, approveTicket side effects, multi-org isolation.
- PDF export of invoices (`react-pdf` or Puppeteer-on-Vercel).
- CSV export of transactions / invoices for QuickBooks import.
- Reports — drilldowns, date range, top-customer / top-commodity views.
- Dashboard — expose the widget drag-and-drop UI (state is persisted but reorder controls aren't wired).

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
