# Marketplace monorepo

pnpm workspace: **Prisma** → PostgreSQL (usually **Supabase**), **vendor** and **admin** Next.js apps (same-origin **`/api`** route handlers via **`@marketplace/marketplace-server`**), **Expo** mobile app.

### Quick start (after `.env` and `pnpm db:setup` or migrate + seed)

```bash
pnpm dev
```

Starts **vendor (3000)** + **admin (3002)**. On a **memory-constrained** machine use `pnpm dev:lite` instead. See **`docs/DEV_SCRIPTS.md`** for all dev commands and ports.

### Admin app (Phase 1): Supabase Auth

The **admin-web** UI uses **Supabase Auth** for sign-in and session (cookies). Admin dashboard data uses same-origin **`/api/admin/*`** route handlers (Prisma) with the **Supabase access token** in `Authorization: Bearer` (see `SUPABASE_JWT_SECRET` in `.env`).

1. Apply migrations (includes `auth_user_id` on `public."User"`): `pnpm db:migrate` or `pnpm db:migrate:dev`
2. Seed: `pnpm db:seed`
3. Copy **JWT Secret** from Supabase Dashboard → Settings → API into **`SUPABASE_JWT_SECRET`** in root `.env`
4. Link seeded users to Supabase Auth: `pnpm db:link-supabase-auth` (creates/finds `auth.users`, sets `User.auth_user_id`, and **confirms email** via Admin API so login works with “Confirm email” enabled). New users get password **`ChangeMe123!`**. If the email **already existed** with another password: `LINK_RESET_AUTH_PASSWORD=1 pnpm db:link-supabase-auth`.
5. Optional: run `supabase/migrations/20260211120000_user_rls_auth_slice.sql` in the Supabase SQL editor for profile RLS
6. Run **admin** + **vendor**: `pnpm dev` (or `pnpm run dev:admin` / `pnpm run dev:vendor` separately)

Admin login: **Supabase Auth** (not the Prisma `hashedPassword` field). Use **`admin@marketplace.com`** / **`ChangeMe123!`** after a successful link (or reset via Dashboard → Authentication → Users).

---

## Prerequisites

- Node.js ≥ 18  
- [pnpm](https://pnpm.io/)  
- A Supabase project (Postgres + optional Storage buckets for uploads)

---

## 1. Install dependencies

```bash
pnpm install
```

---

## 2. Configure environment

```bash
cp .env.example .env
```

Edit **`.env` at the repo root**. Do **not** hand-type Postgres passwords; use **exact strings from the Supabase dashboard**.

### Supabase → Postgres URLs (critical)

Paste **exact** strings from **Supabase → Connect**. Do **not** guess pooler regions or hostnames.

| Variable | Where to copy from | Purpose |
|----------|-------------------|---------|
| **`DATABASE_URL`** | **Connect → Transaction pooler** (Supavisor, port **6543**, user `postgres.<PROJECT_REF>`) | **Next `/api` route handlers** (`@marketplace/marketplace-server`), **`prisma db seed`**, and any long-lived server connections. Must include **`?pgbouncer=true`**. |
| **`DIRECT_URL`** | **Connect → Session pooler** (Supavisor, port **5432**, same user pattern) | **Prisma CLI only** (`migrate`, `db push`, `studio`). Uses Session mode so migrations work; **not** the transaction pooler (`6543`). |

**IPv4 / connectivity:** The **Direct connection** string (`db.<project>.supabase.co:5432`) often fails from **IPv4-only** networks with Prisma **`P1001`** (cannot reach host). That is expected in many environments — **do not** rely on the direct host for Prisma CLI here. Use the **Session pooler** URI for **`DIRECT_URL`** instead.

**If you see `FATAL: Tenant or user not found`:** reset the **database password** in **Project Settings → Database**, then paste fresh **Transaction** + **Session** pooler strings from **Connect**. URL-encode special characters in passwords (e.g. `!` → `%21`).

### Other keys

- **`NEXT_PUBLIC_SUPABASE_URL`**, **`NEXT_PUBLIC_SUPABASE_KEY`**, **`SUPABASE_SERVICE_ROLE_KEY`**: **Settings → API** (service role for server-side storage uploads).  
- **`apps/vendor-web/.env.local`**: same public Supabase keys; leave **`NEXT_PUBLIC_API_URL`** unset to use same-origin **`/api`**.  
- **`apps/mobile/.env.local`**: `EXPO_PUBLIC_SUPABASE_*` and **`EXPO_PUBLIC_VENDOR_API_URL=http://<your-LAN-IP>:3000/api`** for physical devices hitting vendor-web (not `localhost`).

---

## 3. Generate Prisma Client

```bash
pnpm prisma generate
```

(`pnpm db:generate` is the same script.)

---

## 4. Run migrations (default workflow)

**Prefer migration files** (tracked in `prisma/migrations/`):

```bash
# After schema changes in development (creates/applies migrations):
pnpm db:migrate:dev

# Deploy migrations (CI / production):
pnpm db:migrate
```

`prisma.config.ts` sets the CLI datasource to **`DIRECT_URL` first**, then **`DATABASE_URL`**. **`DIRECT_URL`** should be the **Session pooler** (`:5432`) from Connect, not the direct `db.*` host, when the latter is unreachable.

**Prototype only** (no migration history):

```bash
pnpm db:push
```

---

## 5. Seed the database

```bash
pnpm db:seed
```

Demo users (password **`ChangeMe123!`** unless you change the seed):

| Email | Role |
|-------|------|
| `admin@marketplace.com` | SUPER_ADMIN |
| `vendor@example.com` | STORE_OWNER + sample store/products |

---

## 6. Run admin-web

```bash
pnpm run dev:admin
```

Open **http://localhost:3002/login** → sign in with the seeded admin (Supabase session) → dashboard calls same-origin **`/api/admin/*`** with the Supabase access token.

---

## 7. Run vendor-web

```bash
pnpm run dev:vendor
```

**http://localhost:3000** — vendor **`/api/*`** route handlers (Prisma). Auth is **Supabase** (`@supabase/ssr`); privileged routes send the Supabase access token.

---

## 8. Run mobile (Expo)

```bash
pnpm run dev:mobile
```

**Vendor API calls** use **`EXPO_PUBLIC_VENDOR_API_URL`** (default **`http://127.0.0.1:3000/api`**). The app uses **Supabase Auth** + **`POST /profile/bootstrap`** on vendor-web, then **`POST /applications/store`** / **`/applications/driver`** with the Supabase access token.

---

## Lower RAM while developing

Each dev server is a **separate Node process** with its own **V8 heap cap** (`NODE_OPTIONS=--max-old-space-size`). Running **`dev:all`** starts **two** Next apps (or **three** with mobile), plus **Cursor**, **browser**, etc. — that can still push **total system RAM** high.

**What helps most**

1. **Run only what you need** — e.g. `pnpm run dev:vendor` instead of `dev:all` if you are not touching admin.
2. **Use the lighter scripts** — same apps, **lower per-process heap caps** (slightly higher risk of “heap out of memory” on huge builds):

| Script | What runs | Heap caps (approx.) |
|--------|-----------|---------------------|
| `pnpm run dev:all:lite` | vendor + admin | each Next **1536** MB |
| `pnpm run dev:all:with-mobile:lite` | above + Expo | Next/Expo **1536** MB each |
| `pnpm run dev:stack:lite` | vendor only (lite heap) | see `package.json` |

3. **Close** extra browser tabs, other heavy apps, and Docker/WSL when not needed.

---

## Scripts reference

| Script | Command |
|--------|---------|
| `pnpm dev` | Same as **`pnpm run dev:all`** — vendor + admin |
| `pnpm dev:lite` | Same as **`pnpm run dev:all:lite`** — same apps, lower Node heap caps |
| `pnpm db:generate` | `prisma generate` |
| `pnpm db:migrate` | `prisma migrate deploy` |
| `pnpm db:migrate:dev` | `prisma migrate dev` |
| `pnpm db:push` | `prisma db push` (prototyping) |
| `pnpm db:seed` | Run `prisma/seed.ts` |
| `pnpm db:studio` | Prisma Studio |
| `pnpm db:setup` | `db:generate` → `db:migrate` → `db:seed` (after `.env` is valid) |
| `pnpm db:link-supabase-auth` | Link seeded `User` rows to Supabase Auth (`auth.users`) for admin-web login |
| `pnpm run dev:stack` | vendor-web only (alias) |
| `pnpm run dev:stack:lite` | vendor-web lite |
| `pnpm run dev:all` | vendor + admin |
| `pnpm run dev:all:lite` | vendor + admin — **lower Node heap** |
| `pnpm run dev:all:with-mobile` | all of the above + mobile |
| `pnpm run dev:all:with-mobile:lite` | same — **lower Node heap** |
| `pnpm run dev:vendor:lite` / `dev:admin:lite` / `dev:mobile:lite` | one app at a time, lite caps |

---

## Architecture notes

- **Database**: Prisma schema is the source of truth; Next **`/api`** handlers and seed use **Prisma** with the **`pg`** adapter (`DATABASE_URL`). **`pnpm db:seed`** uses the same pattern (`PrismaPg` + `DATABASE_URL` in `prisma/seed.ts`). **`DIRECT_URL`** (Session pooler `:5432`) is for Prisma CLI only (`migrate`, `db push`, `studio`) when IPv4 cannot reach Supabase’s direct Postgres host.  
- **Migrations**: SQL lives under **`prisma/migrations/`**; new enum value **`INFO_REQUESTED`** is in **`1_add_store_status_info_requested`**.  
- **Storage**: create buckets **`documents`**, **`profiles`**, **`stores`** in Supabase; vendor **`POST /api/storage/upload`** uses the service role.  
- **Auth**: **Supabase Auth** for users; mobile and vendor call **`POST /api/profile/bootstrap`** to link `auth.users` to `public."User"`.  
- **Admin**: **`/api/admin/*`** routes (overview, disputes, notifications, delivery assignments, **`POST /api/admin/delivery/assignments`**, products, payouts, refunds, returns).  
- **Commerce (vendor `/api`)**: cart, checkout, mock payments, customer orders, driver delivery — all Prisma-backed.

---

## Documentation

- **`docs/DEV_SCRIPTS.md`** — dev commands, ports, RAM notes, and how `pnpm dev` maps to the stack.
- **`docs/ARCHITECTURE_SUPABASE_FIRST.md`** — Supabase-first architecture notes.
- **`docs/CONNECTIVITY_AUDIT.md`** — connectivity matrix and historical fixes.

---

## After credentials work — verification checklist

1. `pnpm db:generate` (same as `pnpm exec prisma generate`)  
2. `pnpm db:migrate` (or `db:migrate:dev` during schema work)  
3. `pnpm db:seed`  
   - Or one shot: `pnpm db:setup` (runs all three in order)  
4. Vendor + admin running (`pnpm dev`)  
5. Admin UI **http://localhost:3002/login** (Supabase) → applications inbox via **`/api/admin/*`**  
6. Vendor **http://localhost:3000** → dashboard → products load from **`GET /api/stores/me/products`** (Supabase JWT)  
7. Mobile → store/driver registration (Supabase + **`EXPO_PUBLIC_VENDOR_API_URL`**) → **`POST …/applications/store`** / **`…/applications/driver`**
