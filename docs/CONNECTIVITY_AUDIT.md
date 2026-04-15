# Connectivity & architecture audit

_Use with `README.md`, `docs/ARCHITECTURE_SUPABASE_FIRST.md`, and `.env.example`._

## 1. What was inspected

| Area | Files / locations |
|------|-------------------|
| Root | `package.json`, `pnpm-workspace.yaml`, `.env.example`, `prisma/schema.prisma`, `prisma/seed.ts`, `prisma.config.ts` |
| Commerce API | `apps/vendor-web/src/app/api/**` — catch-all `/api/[...segments]`, profile bootstrap, storage upload |
| Admin API | `apps/admin-web/src/app/api/admin/**` — catch-all `/api/admin/[...segments]`, `/api/admin/me` |
| Vendor UI | `apps/vendor-web` — App Router, `src/lib/api.ts`, middleware, register flows, `vendor/dashboard` |
| Admin UI | `apps/admin-web` — dashboard, `src/utils/api.ts` |
| Mobile | `apps/mobile` — Supabase client, `EXPO_PUBLIC_VENDOR_API_URL` → vendor `/api` |
| Packages | `packages/marketplace-server` (Prisma + auth helpers), `packages/shared-supabase` |

HTTP APIs are **Next.js route handlers** on each app’s dev port (vendor **3000**, admin **3002** by default). There is no separate standalone API process in this repo.

---

## 2. Environment / config

### Aligned

- **Prisma** targets PostgreSQL via `DATABASE_URL` (runtime pooler) and `DIRECT_URL` (CLI / migrations) in `prisma.config.ts` and root `.env`.
- **Vendor** and **admin** Next apps load root `.env` / `.env.local` (see each app’s config). Browser clients call **same-origin** `/api` or `/api/admin` unless `NEXT_PUBLIC_API_URL` / `API_INTERNAL_URL` override server-side fetches.
- **Supabase**: `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_JWT_SECRET` (HS256 legacy) as documented in `.env.example`.

### Manual setup

- **Supabase Storage buckets** (`documents`, `profiles`, `stores`) must exist in the Supabase dashboard; uploads fail until they are created.

---

## 3. Database / Prisma

- Schema covers commerce, delivery, payouts, disputes, audit, notifications, etc.
- **`seed.ts`** seeds roles, admin, vendor, categories, store, products with bcrypt passwords for test users.

Run **`pnpm db:push`** or **`pnpm db:migrate:dev`** when the database URL is valid.

---

## 4. HTTP API surface

| App | Base | Role |
|-----|------|------|
| vendor-web | `/api/*` | Store owner + catalog + cart/checkout/customer orders + driver delivery (see `apps/vendor-web/src/app/api/[...segments]/route.ts`) |
| admin-web | `/api/admin/*` | Super-admin operations (e.g. `POST /api/admin/delivery/assignments`) |

Implementation uses **`@marketplace/marketplace-server`** for Prisma access and `assertUser*` helpers on the `Authorization` bearer (Supabase access token).

---

## 5. UI ↔ API wiring (summary)

| Surface | API base | Notes |
|---------|----------|--------|
| Vendor registration / dashboard | Same-origin `/api` | Supabase session + `Authorization: Bearer` to `/api/...` |
| Admin dashboard | Same-origin `/api/admin` | Supabase session; server routes enforce admin roles |
| Mobile | `EXPO_PUBLIC_VENDOR_API_URL` (e.g. `http://LAN:3000/api`) | Physical devices need LAN IP; calls vendor `/api` |

---

## 6. Operational checklist

1. Create Supabase buckets as needed.  
2. Run migrations + seed.  
3. Start **`pnpm dev`** (vendor + admin) or individual app dev scripts.  
4. Test store application, admin review, and commerce flows against Next `/api` only.

---

## 7. Status

Platform wiring: **Supabase Auth** + **Prisma** via **Next route handlers** and **`packages/marketplace-server`**.
