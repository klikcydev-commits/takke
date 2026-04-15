# API specification

## 1. Architecture

- **Surface**: **Next.js App Router** `route.ts` handlers on **vendor-web** (`/api/*`) and **admin-web** (`/api/admin/*`).
- **Data layer**: **`@marketplace/marketplace-server`** (Prisma + Postgres). Handlers run on the Node server only.
- **Format**: JSON request/response bodies for typical REST-style calls; errors as JSON or plain text depending on the route.

## 2. Authentication

- **Provider**: **Supabase Auth** — access tokens sent as `Authorization: Bearer <access_token>`.
- **Verification**: Server routes use helpers in `packages/marketplace-server` (JWKS / ES256 when configured, or HS256 via **`SUPABASE_JWT_SECRET`** where applicable).
- **Roles**: Resolved from `public."User"` and role assignments after the token is verified.

## 3. Apps and bases

| App | Base path | Notes |
|-----|-----------|--------|
| vendor-web | `/api/*` | Commerce, applications, storage upload, profile bootstrap |
| admin-web | `/api/admin/*` | Admin-only operations (e.g. delivery assignment create) |

Use **same-origin** URLs in the browser. For server-side `fetch` from Next, set **`API_INTERNAL_URL`** if you must call another origin (defaults: vendor `http://127.0.0.1:3000`, admin `http://127.0.0.1:3002`).

## 4. Mobile / Expo

- Point **`EXPO_PUBLIC_VENDOR_API_URL`** at the vendor app’s **`/api`** base (LAN IP for physical devices).

## 5. Related docs

- `README.md` — setup and scripts.
- `docs/ARCHITECTURE_SUPABASE_FIRST.md` — security and layering.
- `docs/CONNECTIVITY_AUDIT.md` — env and wiring matrix.
