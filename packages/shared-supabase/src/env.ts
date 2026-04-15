/**
 * Public Supabase configuration (safe for browsers / Expo).
 * Service role key must never be passed here.
 */
export type PublicSupabaseEnv = {
  url: string;
  anonKey: string;
};

export function getPublicSupabaseEnv(
  env: Record<string, string | undefined> = typeof process !== "undefined"
    ? (process.env as Record<string, string | undefined>)
    : {},
): PublicSupabaseEnv {
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey =
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    env.NEXT_PUBLIC_SUPABASE_KEY ??
    env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    env.EXPO_PUBLIC_SUPABASE_KEY;
  if (!url?.trim() || !anonKey?.trim()) {
    throw new Error(
      "Missing Supabase env: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or ANON_KEY / legacy KEY; EXPO_PUBLIC_* in Expo).",
    );
  }
  return { url: url.trim(), anonKey: anonKey.trim() };
}
