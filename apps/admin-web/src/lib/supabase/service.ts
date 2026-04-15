import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";
import path from "path";

/**
 * Route handlers in dev sometimes miss monorepo root `.env.local`; reload likely dirs once.
 */
function ensureServerEnvLoaded(): void {
  if (typeof window !== "undefined") return;
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

/**
 * Service-role client — server-only (Route Handlers / Server Actions).
 * Never import from client components.
 */
export function createServiceClient() {
  ensureServerEnvLoaded();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ??
    process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url?.trim() || !key) {
    throw new Error(
      "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY for server routes. Add them to apps/admin-web/.env.local (see README).",
    );
  }
  return createClient(url.trim(), key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
