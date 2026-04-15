# Supabase-first architecture (target state)

This document records the **Supabase-first** platform shape. HTTP APIs live in **Next.js route handlers** backed by **`@marketplace/marketplace-server`** (Prisma).

## Target platform

| Layer | Choice |
|--------|--------|
| Auth | **Supabase Auth** (`auth.users`), sessions via **JWT** / refresh where applicable |
| Database | **Supabase Postgres** (same physical DB as today; schema evolves via Supabase migrations or SQL) |
| Storage | **Supabase Storage** (buckets + policies aligned with roles) |
| Data access (clients) | **`@supabase/supabase-js`** + **RLS**; no Prisma in Expo or Next **app** code |
| Privileged logic | **Next.js Route Handlers** or **Supabase Edge Functions** with **service role** only on the server; **never** expose service role to browsers or Expo |

## Apps (separate codebases, shared packages)

| App | Stack | Supabase usage |
|-----|--------|----------------|
| **Mobile** | Expo | Direct Supabase client with secure storage; RLS enforces row access |
| **Vendor** | Next.js | Direct reads/writes where RLS allows; uploads via Storage policies or small server helpers |
| **Admin** | Next.js | Prefer **server-side** routes for **approve/deny, payouts, moderation**; direct reads optional where RLS + role claims suffice |

Shared **`packages/*`**: env helpers, role constants, validators, UI tokens/components (introduce incrementally), generated **Database** types from Supabase CLI.

## Security model (summary)

1. **RLS on by default** for `public` tables exposed to PostgREST.
2. **JWT claims** map to app roles (e.g. `app_role`, or join to `User` / profile tables) — exact shape to be defined in migration Phase 1.
3. **Store owner**: policies restrict `Store`, `Product`, etc. to `owner_id = auth.uid()` (or mapped profile id).
4. **Driver**: policies restrict `Driver`, assignments, etc. to that driver’s rows.
5. **Customer**: orders/cart scoped to owning user.
6. **Admin / SUPER_ADMIN**: **not** implemented as “service role in the browser”. Use **server routes** or **Edge Functions** that verify role then perform privileged updates.

## Business rules (preserved)

- **Store owner = supplier** (same role / store ownership model as today).
- **Store owner onboarding**: application record + **admin approval** before full dashboard access (enforce in RLS + app routing).
- **Driver onboarding**: same pattern.
- **Approval state** gates dashboards (client + DB checks).
- **Relationships** across stores, products, orders, deliveries, payments, disputes, notifications, audit logs remain **relational** in Postgres; RLS must not break referential integrity (use policies, not ad-hoc deletes).

## HTTP API surface (Next + Prisma)

| Area | Path | Notes |
|------|------|-------|
| Admin | **`/api/admin/*`** (admin-web) | Supabase JWT + admin role; includes **`POST …/delivery/assignments`** |
| Vendor / customer | **`/api/*`** (vendor-web) | Catalog, applications, vendor CRUD, **cart, checkout, payments, customer orders, driver delivery**, storage upload, profile bootstrap |

Domain logic for privileged and Prisma-backed operations lives in **`packages/marketplace-server`** and is imported only by **server** route handlers.

## Phased implementation (recommended)

### Phase 0 — Foundation (this repo)

- Add **`packages/shared-supabase`** (env + typed client helpers).
- Add Supabase **CLI** workflow for types: `supabase gen types typescript`.
- Document env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, server-only `SUPABASE_SERVICE_ROLE_KEY` for privileged routes.

### Phase 1 — Auth & identity (**implemented for admin-web**)

- **admin-web** uses **Supabase Auth** (`signInWithPassword`), **middleware** session refresh, **`GET /api/admin/me`** (service role server-side) for profile + roles + `canAccessAdmin`, and **AuthGate** + **axios** sending the **Supabase access token** to same-origin **`/api/admin/*`**.
- **Route handlers** verify **Supabase JWT** (JWKS / ES256 when configured, or HS256 via **`SUPABASE_JWT_SECRET`** server-only) and resolve `public."User"` via **`auth_user_id`**.
- **Bootstrap:** `pnpm db:link-supabase-auth` after seed; optional RLS SQL in `supabase/migrations/20260211120000_user_rls_auth_slice.sql`.
- **Vendor / mobile** use **Supabase Auth** + **`POST /api/profile/bootstrap`** (vendor-web) for Prisma profile linking.

### Phase 2 — Applications & approvals

- Model `DriverApplication`, `Store` approval state in Postgres; RLS for applicants vs admins.
- Replace `/applications/*` and `/admin/applications/*` with Supabase queries + **admin server actions** for approve/deny.

### Phase 3 — Vendor & catalog

- RLS for store-scoped products; replace `/vendor/*`, `/stores/me/*`, `/catalog/*`.

### Phase 4 — Orders, checkout, payments, delivery

- RLS per role; privileged payment/settlement steps on **server only**.

## What we are **not** doing

- Putting **service role** keys in client bundles.

## Related docs

- `docs/DEV_SCRIPTS.md` — current dev commands (`pnpm dev` = vendor + admin).
- `docs/CONNECTIVITY_AUDIT.md` — historical connectivity notes.
