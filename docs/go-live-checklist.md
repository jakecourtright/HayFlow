# HayFlow — Go-Live Checklist

**Status as of 2026-07-20: LIVE.** Production runs at **hayflow.io** on the Clerk production instance with Stripe live mode. First real customer (org "TCF BARN") completed a live trial checkout and created their first invoice on 2026-07-20 — their trial converts to a real charge on **Aug 3, 2026**. What remains below is post-launch hardening, not launch blockers.

---

## ✅ DONE — payment wiring (completed & live-verified 2026-07-20)

- [x] Create the **Clerk production instance** (2026-07 — $25/mo Pro tier; custom-roles add-on NOT purchased, roles live in our Postgres instead).
- [x] Activate **Stripe live mode** and connect it to the production Clerk instance (verified: prod instance serves a `pk_live` Stripe key, org billing enabled).
- [x] Re-create both billing plans in prod: `hayflow_pro` ($25/mo, ≤2 users) and `hayflow_pro_team` ($100/mo, unlimited), each with the 14-day trial (verified via Clerk API 2026-07-20).
- [x] ~~Org roles + permissions in prod Clerk~~ — not needed: roles moved into our Postgres (`org_member_roles`, 2026-07-18). See [roles-and-permissions.md](roles-and-permissions.md).
- [x] Production env vars: `pk_live` / `sk_live`, prod `DATABASE_URL`, `CLERK_SECRET_KEY` (hayflow.io serves the live publishable key).
- [x] Run a real checkout with a live card (2026-07-20 — first customer trial; the debugging that got there surfaced the fixes listed below).
- [ ] Migrate the original free-tier user from the dev instance (sign up fresh on prod, re-point his Neon rows to the new `org_id`/`user_id`, update `BILLING_BYPASS_*` in Vercel). Not launch-blocking — new customers sign up directly on prod.

## ✅ DONE — database migration (2026-07-20)

- [x] `npm run migrate` run against the **production** database. Creates `invoice_counters` and — added the same day — normalizes any `text`-typed `org_id`/`user_id` columns to `VARCHAR(255)` (legacy ad-hoc scripts had left `text` columns, which broke invoice creation with Postgres 42P08; see "launch-day fixes" below).

## ✅ DONE — legal pages (published 2026-07-18)

- [x] All `[BRACKETED]` placeholders filled.
- [x] ToS + Privacy published at `/terms` and `/privacy`, linked from the homepage and billing page.
- [ ] **Attorney review still pending** — a licensed attorney should review [terms-of-service.md](legal/terms-of-service.md) and [privacy-policy.md](legal/privacy-policy.md), especially the limitation-of-liability, arbitration, and conflict-of-interest sections (ToS §5, Privacy §4) covering Dune Summit LLC's owner working at a hay export company.

---

## 🔴 OPEN — post-launch hardening (ordered by urgency)

### 1. Stripe payout account
- [x] Connect the bank account for payouts on the live Stripe account (done 2026-07-20, ahead of the Aug 3 first trial conversion).

### 2. Error visibility — would have saved hours on launch day
- [x] `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` set in Vercel; verified end-to-end 2026-07-20 (test event captured from vercel-production). The instrumentation shipped 2026-07-18 but is a no-op without these. The 42P08 invoice bug (2026-07-20) had to be diagnosed via manual Vercel log digging; Sentry would have surfaced it instantly.
- [ ] Optional: `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` for source-map upload.
- [ ] **Return structured errors from server actions.** Next.js masks thrown `Error` messages in production, so users see "An error occurred in the Server Components render…" instead of "Insufficient stock (need 200, have 150)" — every validation, stock, and subscription message in `quickSale` and friends is invisible to real users. Convert user-facing actions to return `{ error: string }` and render it in the forms.

### 3. Supporting services
- [ ] Upstash Redis (`UPSTASH_REDIS_REST_URL`/`_TOKEN`) — enables rate limiting on the public `/invoice/[token]` route (safe no-op until set).
- [x] Uptime monitor — UptimeRobot on `GET /api/health`, 5-min interval (done 2026-07-20).
- [x] support@hayflow.io live on iCloud custom domain (2026-07-20); help-widget escalations save to DB and open the user's mail client prefilled.

### 4. Schema-migration tracking
- [ ] The 42P08 incident proved schema drift is real: ad-hoc scripts left prod columns typed differently than `schema.sql`. The new normalization block in `schema.sql` heals the known drift, but a `schema_migrations(name, applied_at)` table (or Drizzle) would prevent the class. See [launch-readiness.md](launch-readiness.md).

---

## 🔧 Launch-day fixes (shipped 2026-07-20)

Debugging the first real customer's signup surfaced and fixed three production issues:

1. **`hay-flow.vercel.app` → `hayflow.io` 308 redirect** (middleware). Production Clerk is domain-locked to hayflow.io; on the Vercel default alias, auth and billing fail *silently* — checkout's "Start free trial" did nothing. Old bookmarks now land on the canonical domain. (Exact-host match keeps preview deployments working.)
2. **42P08 on invoice creation.** `nextInvoiceNumber` bound `orgId` as one placeholder used against two differently-typed `org_id` columns (prod drift: `text` vs `varchar`). Fixed by binding it as two parameters + the schema normalization block above. Every invoice creation in prod failed until this; Quick Sale was the first code path to hit it.
3. **Billing management UX.** Subscribed orgs had no way to edit payment methods, view invoices, or cancel — Clerk's `OrganizationProfile` (which contains that Billing tab) was never mounted. Now at `/settings/organization`, linked from a state-aware `/billing` hub. `@clerk/nextjs` bumped 7.3.2 → 7.5.20. **Payment methods must be changed there, not in the Stripe dashboard** — Clerk charges the payment method it has on record and ignores cards added Stripe-side.

## ✅ Code-complete (shipped 2026-05-29 / 2026-07-18)
- Data-integrity fixes: `approveTicket` transactional + stock re-check under advisory lock; `createTicket` locked; race-/deletion-safe invoice numbering via `invoice_counters`.
- Rate limiting on the public invoice route (Upstash, graceful no-op fallback).
- Sentry error tracking (server / edge / client, all DSN-gated).
- `/api/health` endpoint for uptime monitoring.
- Legal pages for Dune Summit LLC with conflict-of-interest disclosure (published; attorney review pending).
- Marketing decks (`marketing/`) + preview site.

## Nice-to-have (first month after launch)
See [launch-readiness.md](launch-readiness.md) P1/P2 — tests, invoice PDF/CSV export, "Send Invoice" email, audit log, backups runbook.
