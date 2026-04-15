import { loadEnvConfig } from "@next/env";
import path from "path";

let loaded = false;

/**
 * Route handlers in dev often miss monorepo root `.env.local` (where DATABASE_URL +
 * SUPABASE_SERVICE_ROLE_KEY usually live). Reload likely dirs once — same pattern as admin-web.
 */
export function ensureVendorApiEnvLoaded(): void {
  if (typeof window !== "undefined") return;
  if (loaded) return;
  loaded = true;
  const dev = process.env.NODE_ENV !== "production";
  const cwd = process.cwd();
  const roots = [
    cwd,
    path.resolve(cwd, ".."),
    path.resolve(cwd, "..", ".."),
  ];
  for (const root of roots) {
    try {
      loadEnvConfig(root, dev);
    } catch {
      /* ignore */
    }
  }
}
