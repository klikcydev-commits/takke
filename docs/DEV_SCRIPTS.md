# Development scripts

This monorepo uses **pnpm workspaces**. Run commands from the **repository root** unless you are inside a single app.

## Package manager

- **Use pnpm** (`pnpm install`, `pnpm dev`). The root scripts call `pnpm --filter <app>` internally.
- If you use **`npm run dev`** from the root, it works as long as **pnpm is installed** and on your `PATH`, because the `dev` script delegates to `pnpm run dev:all`.

## Quick start

| Goal | Command |
|------|---------|
| Vendor + admin (Supabase-first `/api` routes), default heap caps | `pnpm dev` (same as `pnpm run dev:all`) |
| Same apps, **lower RAM** (smaller `--max-old-space-size`) | `pnpm dev:lite` (same as `pnpm run dev:all:lite`) |
| Vendor only | `pnpm run dev:stack` or `pnpm run dev:stack:lite` (aliases) |
| One app | `pnpm run dev:vendor`, `pnpm run dev:admin`, `pnpm run dev:mobile`, etc. |

## Ports

| Service | Port | Script |
|---------|------|--------|
| vendor-web (Next.js) | **3000** | `pnpm run dev:vendor` |
| admin-web (Next.js) | **3002** | `pnpm run dev:admin` |

**Admin login (`/login`)** uses **Supabase Auth**; dashboard data uses same-origin **`/api/admin/*`** (Prisma). There is **no separate API service** — only these Next.js dev servers.

## What runs when you use `pnpm dev`

1. **`concurrently`** starts two subprocesses: `dev:vendor`, `dev:admin`.
2. Each subprocess is **one** filtered workspace `pnpm run` (no script calls itself and no A → B → A loop).
3. **Next.js 16 (Turbopack)** owns a **process tree** with **multiple Node processes** (workers, watchers). That is **normal**, not duplicate dev servers on the same port.

## RAM and laptop load

- **`pnpm dev`** runs **two** long-lived Next dev servers at once, each with a **raised V8 heap cap** via `NODE_OPTIONS`. Total RAM use can be high.
- **`pnpm dev:lite`** runs the same two apps with **lower** heap caps (see per-app `package.json` scripts). Prefer this on **8 GB** machines or when the system swaps/freezes.
- **Run only what you need** (e.g. `dev:admin` only) if you are not editing every app.

## Root script reference

| Script | Behavior |
|--------|----------|
| `dev` | `dev:all` — vendor + admin |
| `dev:lite` | `dev:all:lite` — same, lower heap caps |
| `dev:vendor` / `dev:admin` / `dev:mobile` | Single app |
| `dev:vendor:lite` / `dev:admin:lite` / `dev:mobile:lite` | Single app, lite heap |
| `dev:stack` | vendor-web only (alias) |
| `dev:stack:lite` | vendor-web lite |
| `dev:all` | vendor + admin |
| `dev:all:lite` | vendor + admin, lite |
| `dev:all:with-mobile` | vendor + admin + Expo |
| `dev:all:with-mobile:lite` | Same, lite |
| `db:*` | Prisma — see main README |

## Turbopack and the monorepo root

`apps/admin-web/next.config.ts` and `apps/vendor-web/next.config.ts` set `turbopack.root` to the **monorepo root** so resolution and tracing match the pnpm layout. That can increase **watch scope** versus a single-package app; it does **not** by itself spawn extra copies of `pnpm dev`.
