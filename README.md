# HayFlow

Modern inventory and invoicing for hay growers and dealers. Track bales, approve driver tickets, send clean invoices — from the barn or the office.

## Tech stack

- **Next.js 16** App Router · **React 19** · **TypeScript**
- **Clerk** — auth + multi-tenant Organizations + roles
- **Neon Postgres** (serverless pool, raw SQL — no ORM)
- **Tailwind CSS v4** with a branded theme system
- **Zod** for validation · **Recharts** for reports · **Lucide** icons

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL, Clerk keys
npm run migrate              # apply src/db/schema.sql to Neon
npm run dev                  # http://localhost:3000
```

Required environment variables:

- `DATABASE_URL` — Neon Postgres pooled connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk frontend key
- `CLERK_SECRET_KEY` — Clerk backend key

## Project knowledge

Start with [`CLAUDE.md`](CLAUDE.md) for an overview of how the app is structured, the data model, and the working conventions. Deeper references:

- [docs/architecture.md](docs/architecture.md)
- [docs/data-model.md](docs/data-model.md)
- [docs/roles-and-permissions.md](docs/roles-and-permissions.md)
- [docs/user-flows.md](docs/user-flows.md)
- [docs/launch-readiness.md](docs/launch-readiness.md)
- [docs/design-identity.md](docs/design-identity.md)

## Scripts

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run migrate` — apply consolidated schema to `DATABASE_URL`
- `npm run migrate:*` — legacy one-off migrations (kept for historical reference)

## Status

Pre-launch. See [`docs/launch-readiness.md`](docs/launch-readiness.md) for the open punch list and the prioritized roadmap to paying customers.
