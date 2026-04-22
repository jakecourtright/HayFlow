# Architecture

## Stack

- **Next.js 16.1.4** App Router, **React 19.2.3**, **TypeScript strict**
- **Clerk 6.36** (`@clerk/nextjs`) — auth, Organizations (multi-tenant boundary), custom permissions
- **Neon Postgres** via `@neondatabase/serverless` + `ws` (WebSocket pool; no ORM)
- **Tailwind CSS v4** (@tailwindcss/postcss)
- **Zod 4** validation, **Recharts 3.7** charts, **Lucide-react** icons

## Routing

All routes under `src/app/` with App Router conventions. Layout hierarchy:

```
src/app/layout.tsx                 → ClerkProvider + ThemeProvider + header + RoleNav + children
  src/app/page.tsx                 → signed-out hero / signed-in dashboard (redirects drivers)
  src/app/tickets/                 → list, new/, [id]/
  src/app/dispatch/                → queue + invoices/[id]/edit/
  src/app/invoice/[token]/         → PUBLIC (no layout wrapping for print styling)
  src/app/sell/                    → Quick Sale shortcut
  src/app/stacks/, /locations/, /inventory/, /transactions/, /reports/, /settings/, /log/
```

**Middleware** (`src/middleware.ts`) uses `clerkMiddleware` with `createRouteMatcher` to gate:
`/log`, `/locations`, `/stacks`, `/inventory`, `/reports`, `/settings`, `/tickets`, `/dispatch`, `/sell`. Anything under `/invoice/[token]` is public.

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

- **Target:** Vercel (`vercel.json` is `{ "framework": "nextjs" }`)
- **Required env:** `DATABASE_URL`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- **Build:** `next build` — standard. No custom build steps.
- **Runtime:** Next.js on Vercel. Server actions run as serverless functions; Neon WebSocket pool is initialized once per cold start.

## Migrations

Ad-hoc scripts in `scripts/migrate-*.js`. `src/db/schema.sql` is the **consolidated source of truth** (as of 2026-04-21) — running `npm run migrate` applies it idempotently via `CREATE TABLE IF NOT EXISTS` and column-add blocks.

No schema-version tracking table. If we need formal migrations before scale, the leading options are Drizzle (type-safe, codegen from schema) or a simple applied-migrations table.

## Scaling considerations (when we hit them)

- Neon serverless pool: already pooled; reads scale horizontally on Vercel.
- `WHERE org_id = $n` is indexed on every core table — no known hot spots.
- No background jobs yet. When we add email (e.g., on invoice send) use a queue (Vercel Queues / Upstash) rather than in-line awaits — server actions should stay fast.
