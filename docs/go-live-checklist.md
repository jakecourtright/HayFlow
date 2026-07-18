# HayFlow — Go-Live Checklist

**Status as of 2026-05-29.** These are the **must-do items before taking a real paying customer.** The core app and the items below marked _code-complete_ are done; what remains is configuration, provisioning, and legal — mostly external steps only Jake can do.

---

## 🔴 MUST DO before go-live

### 1. Finish payment wiring (go-live config — billing code is done & test-verified)
Billing is fully coded and verified end-to-end in Stripe **test mode**. Remaining work is flipping it to live:
- [x] Create the **Clerk production instance** (done 2026-07 — Jake upgraded to the $25/mo Pro tier; custom-roles add-on NOT purchased, see roles note below).
- [ ] Activate **Stripe live mode** and connect it to the production Clerk instance.
- [ ] **Re-create in prod** (dev & prod Clerk instances don't share config):
  - [ ] Both billing plans: `hayflow_pro` ($25/mo, ≤2 users) and `hayflow_pro_team` ($100/mo, unlimited), each with the 14-day trial.
  - [x] ~~The org roles + permissions~~ — no longer needed: roles moved into our Postgres (`org_member_roles`, 2026-07-18) precisely so prod Clerk needs no custom-role config. See docs/roles-and-permissions.md.
- [ ] Set production env vars: `pk_live` / `sk_live`, prod `DATABASE_URL`, `CLERK_SECRET_KEY`.
- [ ] **Migrate the existing free-tier user to the prod instance.** Dev-instance users/orgs do NOT carry over. He must sign up again on prod, then: (a) UPDATE all his rows in Neon from the old `org_id`/`user_id` to the new ones, (b) update `BILLING_BYPASS_ORG_IDS` / `BILLING_BYPASS_USER_IDS` in Vercel to the NEW ids, (c) his admin role self-heals (org creators map to admin).
- [ ] Run a real checkout with a live card to confirm the gate + trial clock work in prod.

### 2. Database migration (REQUIRED — invoicing breaks without it)
- [ ] Run `npm run migrate` against the **production** database. This creates the new `invoice_counters` table; the race-safe invoice numbering added 2026-05-29 will error on invoice creation until it exists.

### 3. Environment variables (recommended for launch)
- [ ] `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — enables rate limiting on the public `/invoice/[token]` route. (Without them, rate limiting is a safe no-op.)
- [ ] `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` — enables error tracking. (No-op without them.)
- [ ] Optional: `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` — for source-map upload.

### 4. Provision the supporting services
- [ ] Create an **Upstash Redis** database (for #3 rate limiting).
- [ ] Create a **Sentry** project (free tier is fine).
- [ ] Set up an **uptime monitor** (UptimeRobot / Better Stack / Pingdom) pointed at `GET /api/health`; alert on non-200.

### 5. Legal (attorney review required)
- [ ] Have a licensed attorney review `docs/legal/terms-of-service.md` and `docs/legal/privacy-policy.md` — **especially the conflict-of-interest sections** (ToS §5, Privacy §4) covering Dune Summit LLC's owner working at a hay export company.
- [ ] Fill all `[BRACKETED]` placeholders (state, addresses, support email, effective date).
- [ ] Publish both, and link them from the app (signup, footer, billing page).

### 6. Business setup
- [x] Operating entity: **Dune Summit LLC** (have it).
- [ ] Stripe payout / bank account connected for the live Stripe account.
- [ ] A support email address that routes somewhere monitored.

---

## ✅ Code-complete (shipped 2026-05-29, pending the config above)
- Data-integrity fixes: `approveTicket` transactional + stock re-check under advisory lock; `createTicket` locked; race-/deletion-safe invoice numbering via `invoice_counters`.
- Rate limiting on the public invoice route (Upstash, graceful no-op fallback).
- Sentry error tracking (server / edge / client, all DSN-gated).
- `/api/health` endpoint for uptime monitoring.
- Legal drafts for Dune Summit LLC with conflict-of-interest disclosure.

## Nice-to-have (first month after launch)
See `docs/launch-readiness.md` P1/P2 — tests, invoice PDF/CSV export, "Send Invoice" email, audit log, backups runbook.
