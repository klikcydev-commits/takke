"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function safeNext(next: string | null): string {
  if (!next?.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const next = safeNext(searchParams.get("next"));
    const code = searchParams.get("code");
    const supabase = createClient();

    async function finish() {
      if (code) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exErr) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session) {
            router.replace(next);
            return;
          }
          setError(exErr.message);
          return;
        }
        router.replace(next);
        return;
      }

      const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
      if (hash) {
        const params = new URLSearchParams(hash);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          const { error: sessionErr } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (sessionErr) {
            setError(sessionErr.message);
            return;
          }
          window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
          router.replace(next);
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        router.replace(next);
        return;
      }

      router.replace(
        `/?auth=error&details=${encodeURIComponent("Missing confirmation parameters. Try the link from your email again.")}`,
      );
    }

    void finish();
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <button
          type="button"
          className="text-sm underline"
          onClick={() => router.replace("/")}
        >
          Back to home
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6 text-sm text-muted-foreground">
      Confirming your email…
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center p-6 text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
