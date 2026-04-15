import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublicSupabaseEnv, type PublicSupabaseEnv } from "./env.js";

/** Browser / Expo: anon key + RLS. */
export function createSupabaseAnonClient(
  env?: PublicSupabaseEnv,
): SupabaseClient {
  const { url, anonKey } = env ?? getPublicSupabaseEnv();
  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}
