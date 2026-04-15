import type { Database } from "@marketplace/supabase-db-types";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let singleton: SupabaseClient<Database> | null = null;

/**
 * Server-only Supabase client with **service role** — bypasses RLS.
 * Use only in Next route handlers / trusted server code. Never import in client bundles.
 */
export function getServiceRoleSupabase(): SupabaseClient<Database> {
  if (singleton) return singleton;
  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) must be set for server-side data access.",
    );
  }
  singleton = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return singleton;
}
