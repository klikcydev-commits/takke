# Marketplace Monorepo (Supabase-First)

This repository runs a Supabase-first marketplace stack:

- `apps/mobile` (Expo React Native)
- `apps/vendor-web` (Next.js vendor + driver web)
- `apps/admin-web` (Next.js admin web)
- Supabase Auth, Postgres, Storage, SQL migrations, and generated DB types

Prisma is no longer part of active runtime architecture.

## Architecture

- Runtime APIs are implemented in Next.js route handlers in:
  - `apps/vendor-web/src/app/api`
  - `apps/admin-web/src/app/api`
- Server-side privileged operations use Supabase service-role key only in server handlers.
- Client apps only use publishable/anon keys.
- Role/tenant isolation is enforced in server handlers and database policies.

## Project Structure

```text
apps/
  admin-web/
  vendor-web/
  mobile/
packages/
  shared-supabase/
  supabase-db-types/
  database/
supabase/
  migrations/
scripts/
```

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Copy env template and fill values:

```bash
cp .env.example .env
```

3. Apply Supabase SQL migrations:

```bash
pnpm db:migrate
```

4. (Optional) Link seeded emails to Supabase Auth users:

```bash
pnpm db:link-supabase-auth
```

## Run

```bash
pnpm dev:vendor
pnpm dev:admin
pnpm dev:mobile
```

Or run web apps together:

```bash
pnpm dev:all
```

## Database and Types

- Source of truth: Supabase SQL migrations in `supabase/migrations`.
- Generated DB types package: `packages/supabase-db-types`.

Generate/update type guidance:

```bash
pnpm db:types
```

## Security Notes

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to clients.
- Keep admin and moderation flows server-side only.
- Use authenticated user + role checks for every privileged route.
- Keep audit log writes and status history writes for operational mutations.

## Current Runtime Status

- Vendor API runtime: Supabase-native
- Admin API runtime: Supabase-native
- Mobile auth/profile runtime path: Supabase-native

Legacy Prisma sources may remain in archived folders for historical reference only; they are not active runtime dependencies.
# Marketplace Monorepo

Monorepo for a multi-role commerce and delivery platform with:
- `admin-web` (Next.js) for admin operations
- `vendor-web` (Next.js) for vendor/store and driver-facing web flows
- `mobile` (Expo React Native) for end-user mobile experience
- shared server/business logic in `@marketplace/marketplace-server`

Primary actors implemented in code: customers, store owners/vendors, delivery drivers, and admins.

## 1) Project Overview

This platform combines marketplace flows (catalog, cart, checkout, orders) with onboarding and operational flows (store applications, driver applications, admin review, delivery assignment/status updates).

Current architecture is hybrid:
- Supabase is used for auth/session and parts of data access.
- Prisma + PostgreSQL schema still power a large part of business data access in shared server modules.
- There is active migration work from Prisma-only paths to Supabase-first paths in selected endpoints.

## 2) Tech Stack

- **Monorepo / package manager:** pnpm workspaces
- **Web frontend:** Next.js 16 (App Router), React 19, TypeScript
- **Mobile frontend:** Expo SDK 54, React Native 0.81, Expo Router
- **Auth:** Supabase Auth (`@supabase/supabase-js`, `@supabase/ssr`)
- **Database access:**
  - Prisma 7 + `pg` adapter for many server data modules
  - Supabase service-role client for specific server routes/helpers
- **Database:** PostgreSQL (typically Supabase-hosted)
- **Styling/UI:** Tailwind CSS 4 (web), custom RN components (mobile), Framer Motion (web)
- **State/data client libs:** Zustand, TanStack React Query, Axios
- **Tooling:** TypeScript, ESLint, tsx, concurrently, cross-env, patch-package

## 3) Repository Structure

```text
.
├─ apps/
│  ├─ admin-web/         # Admin Next.js app (port 3002)
│  ├─ vendor-web/        # Vendor/driver Next.js app (port 3000)
│  └─ mobile/            # Expo React Native app
├─ packages/
│  ├─ marketplace-server/  # Shared server/domain logic used by route handlers
│  ├─ shared-supabase/     # Shared Supabase helpers/types/errors/access checks
│  ├─ supabase-db-types/   # Supabase DB TS types
│  └─ database/            # Placeholder/minimal package
├─ prisma/               # Prisma schema, migrations, seed
├─ scripts/              # Repo scripts (e.g. link-supabase-auth)
├─ docs/                 # Specs, setup, architecture, troubleshooting notes
├─ package.json          # Root scripts (dev orchestration + db scripts)
└─ pnpm-workspace.yaml   # Workspace package list
```

## 4) How the Application Works

### End-to-end flow (high level)

- Users authenticate with Supabase.
- Web/mobile clients call Next.js route handlers under `/api/*`.
- Route handlers delegate business operations to shared modules in `@marketplace/marketplace-server`.
- Many of those modules currently use Prisma-backed DB operations; some flows use Supabase service-role queries directly.

### App responsibilities

- **`apps/vendor-web`**
  - Public pages and registration flows.
  - Same-origin API endpoints:
    - Catch-all business API: `src/app/api/[...segments]/route.ts`
    - Profile bootstrap/me endpoints
    - Storage upload endpoint
    - Dev env/auth sync diagnostic endpoints
    - Dedicated driver application route (`/api/applications/driver`) using Supabase service-role client.
  - Uses Supabase auth token in `Authorization: Bearer ...` for protected operations.

- **`apps/admin-web`**
  - Admin login and dashboard pages.
  - Admin APIs:
    - `/api/admin/me`
    - `/api/admin/[...segments]`
  - Admin APIs gate access using bearer token -> app user resolution -> admin role checks.

- **`apps/mobile`**
  - Uses Supabase auth directly in the app.
  - Calls vendor-web API base (`EXPO_PUBLIC_VENDOR_API_URL`) for profile bootstrap/profile APIs and business endpoints.
  - Auth provider loads/refreshes profile and degrades gracefully if profile fetch is unavailable.

### Auth model

- Supabase session tokens are the primary authentication artifact.
- Shared auth helper `getAppUserIdFromBearer` maps Supabase `sub` to app `User` row.
- Role checks (`ADMIN`, `SUPER_ADMIN`, `STORE_OWNER`, `DELIVERY_DRIVER`) are enforced in API routes via shared helpers.

### Data model and role/application flows

- Store applications and driver applications are persisted in database tables represented in Prisma schema.
- Admin routes expose pending applications and review actions.
- Delivery endpoints support assignment acceptance and status transitions.
- Catalog/cart/checkout/payment/order routes are exposed under vendor-web catch-all API.

### Shared package usage

- `@marketplace/marketplace-server`: domain/data modules (admin, applications, catalog, cart, checkout, delivery, orders, products, auth helpers).
- `@marketplace/shared-supabase`: role/access helpers, shared auth error utilities, shared client/env utilities.
- `@marketplace/supabase-db-types`: typed Supabase table contracts for Supabase-client-based modules.

## 5) Installation and Setup

### Prerequisites

- Node.js `>=18` (root `engines.node`)
- pnpm
- Supabase project (URL + publishable/anon key + service-role key)
- PostgreSQL connection strings from Supabase Connect page (transaction + session pooler)

### Setup order

```bash
pnpm install
```

Create env file from template:

```bash
cp .env.example .env
```

Then fill env values (see Environment Variables section).

Generate Prisma client:

```bash
pnpm db:generate
```

Run migrations and seed:

```bash
pnpm db:migrate
pnpm db:seed
```

Or one-shot:

```bash
pnpm db:setup
```

Optional auth linking for seeded users:

```bash
pnpm db:link-supabase-auth
```

## 6) Run Commands

All commands below are real scripts from repository `package.json` files.

### Root workspace

```bash
pnpm dev
pnpm dev:lite
pnpm dev:all
pnpm dev:all:lite
pnpm dev:all:with-mobile
pnpm dev:all:with-mobile:lite
pnpm dev:vendor
pnpm dev:vendor:lite
pnpm dev:admin
pnpm dev:admin:lite
pnpm dev:mobile
pnpm dev:mobile:lite
pnpm dev:stack
pnpm dev:stack:lite
```

### Database / Prisma (root)

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:migrate:dev
pnpm db:push
pnpm db:seed
pnpm db:studio
pnpm db:setup
pnpm db:link-supabase-auth
```

### Per app/package scripts

```bash
# apps/vendor-web
pnpm --filter vendor-web dev
pnpm --filter vendor-web run dev:lite
pnpm --filter vendor-web build
pnpm --filter vendor-web start
pnpm --filter vendor-web lint

# apps/admin-web
pnpm --filter admin-web dev
pnpm --filter admin-web run dev:lite
pnpm --filter admin-web build
pnpm --filter admin-web start
pnpm --filter admin-web lint

# apps/mobile
pnpm --filter mobile start
pnpm --filter mobile run start:lite
pnpm --filter mobile run android
pnpm --filter mobile run ios
pnpm --filter mobile run web
pnpm --filter mobile run lint

# packages/marketplace-server
pnpm --filter @marketplace/marketplace-server build

# packages/shared-supabase
pnpm --filter @marketplace/shared-supabase build

# packages/supabase-db-types
pnpm --filter @marketplace/supabase-db-types generate
```

## 7) Environment Variables

Use `.env.example` as canonical template. Below are variables referenced in source.

### Root/shared server variables

- `DATABASE_URL`  
  Runtime DB connection (used by Prisma runtime and seed scripts).
- `DIRECT_URL`  
  Prisma CLI migrations/push/studio connection.
- `SUPABASE_URL`  
  Server-side Supabase base URL fallback.
- `SUPABASE_SERVICE_ROLE_KEY`  
  Server-side privileged Supabase access (never expose client-side).
- `SUPABASE_SECRET_KEY`  
  Alternate name accepted in some modules.
- `SUPABASE_JWT_SECRET`  
  Required only for legacy HS256 token verification path.
- `SEED_DEMO_PASSWORD`  
  Overrides default seeded auth password for linking script/seed sync.
- `LINK_SUPABASE_EMAILS`  
  Comma-separated email list for `db:link-supabase-auth`.
- `LINK_RESET_AUTH_PASSWORD`  
  If `1`/`true`, resets linked auth user password.

### Web client/public variables (admin-web/vendor-web)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_KEY`
- `NEXT_PUBLIC_API_URL` (optional override for API base)
- `API_INTERNAL_URL` (server-side fallback internal API base)
- `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_APP_URL` (used for auth email redirect construction in driver application route)

### Vendor-web additional flags

- `VENDOR_ALLOW_SYNC_SEED_AUTH`  
  Enables dev sync endpoint behavior outside default development mode.

### Mobile variables

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_SUPABASE_KEY`
- `EXPO_PUBLIC_VENDOR_API_URL` (base to vendor-web API, usually `<host>:3000/api`)

### App-local env files in active use

- `apps/admin-web/.env.local` (admin route handlers need server vars here in dev)
- `apps/vendor-web/.env.local` (vendor route handlers and auth/env checks)
- `apps/mobile/.env.local` (Expo public variables)

## 8) Main Features

Implemented (based on route handlers and shared modules):

- Supabase-based auth/session handling in web + mobile
- Admin dashboard APIs:
  - overview, users, stores, drivers, orders
  - pending store/driver applications
  - review actions for store/driver applications
  - payouts/refunds/returns/disputes/notifications/delivery assignments
- Vendor/store flows:
  - store application submission and status fetch
  - vendor product CRUD operations and moderation-facing support
  - vendor order listing/detail and ready-for-pickup actions
- Driver flows:
  - driver application submission route with auth + verification checks
  - delivery assignment acceptance/status update endpoints
- Customer flows:
  - catalog categories/products
  - cart operations
  - checkout and mock payment confirm/fail endpoints
  - customer order list/detail/tracking
- Mobile profile bootstrap and profile read/update via vendor-web APIs
- Storage upload endpoint under vendor-web API

## 9) Developer Notes

- This repo is currently **hybrid Prisma + Supabase**. Prisma is still required for many business modules.
- `@marketplace/marketplace-server` exports still include `./prisma`; several modules are Prisma-backed.
- Some flows have begun Supabase-native migration (e.g., admin `/api/admin/me`, vendor driver application route).
- Running both Next apps + Expo can be memory-heavy; use `dev:*:lite` scripts when needed.
- Mobile app expects vendor API to be reachable by network from device/emulator.
- `apps/vendor-web` currently has both catch-all `/api/[...segments]` and dedicated `/api/applications/driver`; dedicated route takes precedence for that path.

## 10) Troubleshooting

### `next is not recognized`

Dependencies are missing in app workspace.

```bash
pnpm install
```

### Port already in use (`EADDRINUSE`)

Stop existing Node/Next processes and restart dev.

### Prisma client runtime errors (`Cannot find module '.prisma/client/default'`)

Prisma client not generated.

```bash
pnpm db:generate
```

### Admin `/api/admin/me` role lookup permission errors

Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in `apps/admin-web/.env.local` and DB grants are configured for `service_role`.

### Driver application 4xx errors

- Verify user is signed in and email is confirmed.
- Verify vendor-web env has:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - public Supabase keys
- Ensure required form fields are filled (contact email auto-filled from signed-in user).

### Mobile cannot reach API

Set `EXPO_PUBLIC_VENDOR_API_URL` to a reachable host/IP (not `localhost` from physical device).

### Supabase key confusion

- `sb_publishable_*` / anon keys: client/public use.
- `sb_secret_*` / service-role key: server only.
- Rotate keys if exposed.

## 11) Additional Documentation

- `docs/DEV_SCRIPTS.md` — command matrix, ports, memory notes
- `docs/SETUP_GUIDE.md` — setup walkthrough
- `docs/API_SPEC.md` — API architecture summary
- `docs/ORDER_DELIVERY_FLOW.md` — delivery lifecycle reference
- `docs/ARCHITECTURE_SUPABASE_FIRST.md` — target-state architecture
- `docs/CONNECTIVITY_AUDIT.md` — historical connectivity and integration notes
