import { createBrowserClient } from "@supabase/ssr";

function getAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_KEY ??
    ""
  );
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = getAnonKey();
  if (!url?.trim() || !anon.trim()) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL and a publishable key (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, ANON_KEY, or NEXT_PUBLIC_SUPABASE_KEY).",
    );
  }
  return createBrowserClient(url.trim(), anon.trim());
}
