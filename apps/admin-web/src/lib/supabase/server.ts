import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_KEY ??
    ""
  );
}

export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = getAnonKey();
  if (!url?.trim() || !anon.trim()) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL and a publishable key (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, ANON_KEY, or NEXT_PUBLIC_SUPABASE_KEY).",
    );
  }

  return createServerClient(url.trim(), anon.trim(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options: Record<string, unknown>;
        }[],
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          /* ignore when called from a Server Component that cannot set cookies */
        }
      },
    },
  });
}
