# Architecture

## Stack

- **Next.js 16.2** App Router, **React 19.2**, **TypeScript strict**
- **Clerk 7.5** (`@clerk/nextjs`) — auth, Organizations (multi-tenant boundary), Clerk Billing (Stripe live). App roles live in our Postgres (`org_member_roles`), not Clerk — see [roles-and-permissions.md](roles-and-permissions.md).
- **Neon Postgres** via `@neondatabase/serverless` + `ws` (WebSocket pool; no ORM)
- **Tailwind CSS v4** (@tailwindcss/postcss)
- **Zod 4** validation, **Recharts 3.7** charts, **Lucide-react** icons
- **Sentry** (`@sentry/nextjs`, server/edge/client — no-op until DSN env vars set), **Upstash Ratelimit** (public invoice route — no-op until env vars set)

## Routing

All routes under `src/app/` with App Router conventions. Layout hierarchy:

```
src/app/layout.tsx                 → ClerkProvider + ThemeProvider + header + RoleNav + children
  src/app/page.tsx                 → signed-out hero / signed-in dashboard (redirects drivers)
  src/app/tickets/                 → list, new/, [id]/
  src/app/dispatch/                → queue + invoices/[id]/edit/
  src/app/invoice/[token]/         → PUBLIC (no layout wrapping for print styling)
  src/app/sell/                    → Quick Sale shortcut
  src/app/billing/                 → state-aware billing hub: subscribed orgs get a "manage
                                     payment methods & invoices" card first + plan picker under
                                     "Change plan"; unsubscribed orgs get the PricingTable
  src/app/settings/organization/[[...rest]]/ → Clerk <OrganizationProfile> (path routing) —
                                     Members + Billing tabs; payment methods, invoices, cancel
  src/app/welcome/                 → Clerk <CreateOrganization> for orgless users
  src/app/terms/, /privacy/        → PUBLIC legal pages
  src/app/api/health/              → GET health check for uptime monitoring
  src/app/stacks/, /locations/, /inventory/, /transactions/, /reports/, /settings/, /log/, /help/
```

**Middleware** (`src/middleware.ts`), in order:
1. **Canonical-host redirect** — exact host `hay-flow.vercel.app` 308s to `https://hayflow.io` (path + query preserved). Production Clerk is domain-locked to hayflow.io; auth/billing fail silently on the alias. Exact match keeps `hay-flow-git-*` preview deployments working.
2. **Rate limit** on `/invoice/*` (Upstash, no-op without env vars).
3. `clerkMiddleware` + `createRouteMatcher` gates: `/log`, `/locations`, `/stacks`, `/inventory`, `/reports`, `/settings`, `/tickets`, `/dispatch`, `/sell`, `/transfer`, `/welcome`, `/billing`, `/help`. Anything under `/invoice/[token]`, `/terms`, `/privacy` is public.
4. **Org gate** — signed-in users with no active org are redirected to `/welcome` on org-required routes.

**Billing gating:** write-path server actions call `requireActiveSubscription()` (`src/lib/billing.ts`); access derives from Clerk Billing plans (`hayflow_pro`, `hayflow_pro_team`) via `auth().has({ plan })`. `org_billing.trial_started_at` mirrors the trial start locally for countdown UX only. `BILLING_BYPASS_USER_IDS`/`BILLING_BYPASS_ORG_IDS` env vars exempt internal accounts. **Payment methods must be managed through the app (Clerk), never edited directly in the Stripe dashboard** — Clerk charges the payment method it has on record.

## Data access

**All writes go through server actions** in `src/app/actions.ts`. Each action:

1. `const { userId, orgId, has } = await auth();`
2. Reject if not authenticated or no org.
3. Check `has({ permission: ... })` for permission-gated actions (delete, approve, invoice mgmt).
4. Parse + validate `FormData`.
5. Acquire pool client; run parameterized SQL scoped with `WHERE org_id = $n`.
6. Release client in `finally`.
7. `revalidatePath` the affected routes.
8. `redirect` (if the UX flow needs a navigation).

**Reads** happen directly in server components (async pages). Pattern: a local `async function getX(orgId: string)` that owns the pool client; the page awaits it.

## Deployment

- **Target:** Vercel, project `hay-flow`. **Canonical domain: hayflow.io** (the `hay-flow.vercel.app` alias 308-redirects there — see Middleware).
- **Required env:** `DATABASE_URL`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (live keys in prod — the Clerk prod instance is domain-locked to hayflow.io).
- **Optional env (features no-op without them):** `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` (error tracking), `UPSTASH_REDIS_REST_URL`/`_TOKEN` (invoice-route rate limiting), `BILLING_BYPASS_USER_IDS`/`BILLING_BYPASS_ORG_IDS` (internal-account billing exemption).
- **Build:** `next build`, wrapped in `withSentryConfig` (source-map upload skipped without Sentry credentials).
- **Runtime:** Next.js on Vercel. Server actions run as serverless functions; Neon WebSocket pool is initialized once per cold start.

## Migrations

`src/db/schema.sql` is the **consolidated source of truth** — running `npm run migrate` applies it idempotently via `CREATE TABLE IF NOT EXISTS`, column-add blocks, and a **type-normalization block** that converts any `text`-typed `org_id`/`user_id` column to `VARCHAR(255)`.

That normalization exists because drift is not hypothetical: legacy ad-hoc scripts (`scripts/migrate_orgs.js`) added `org_id` as `TEXT` on live tables, and on 2026-07-20 the mismatch broke all production invoice creation (Postgres 42P08 — a single bound parameter can't serve two differently-typed columns). Lesson: **don't add ad-hoc migration scripts; put schema changes in `schema.sql`.** Related code rule: never reuse one SQL placeholder across columns of different tables (bind the value once per usage instead).

No schema-version tracking table yet. If we need formal migrations before scale, the leading options are Drizzle (type-safe, codegen from schema) or a simple applied-migrations table.

## Scaling considerations (when we hit them)

- Neon serverless pool: already pooled; reads scale horizontally on Vercel.
- `WHERE org_id = $n` is indexed on every core table — no known hot spots.
- No background jobs yet. When we add email (e.g., on invoice send) use a queue (Vercel Queues / Upstash) rather than in-line awaits — server actions should stay fast.
