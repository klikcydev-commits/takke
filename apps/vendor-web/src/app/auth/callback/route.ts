import { NextResponse } from "next/server";
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

/** Only allow same-origin relative paths (avoid open redirects). */
function safeNext(next: string | null): string {
  if (!next?.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextPath = safeNext(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/", url.origin));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = getAnonKey().trim();
  if (!supabaseUrl || !anon) {
    return NextResponse.redirect(new URL("/", url.origin));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options),
        );
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const msg = encodeURIComponent(error.message);
    return NextResponse.redirect(new URL(`/?auth=error&details=${msg}`, url.origin));
  }

  return NextResponse.redirect(new URL(nextPath, url.origin));
}
