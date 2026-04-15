"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AdminMeResponse } from "@marketplace/shared-supabase";

type State = "loading" | "ready" | "redirecting";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (!session) {
        setState("redirecting");
        router.replace("/login");
        return;
      }

      const meRes = await fetch("/api/admin/me", { credentials: "include" });
      const me = (await meRes.json().catch(() => ({}))) as AdminMeResponse & {
        error?: string;
      };

      if (cancelled) return;

      if (!meRes.ok || !me.canAccessAdmin) {
        await supabase.auth.signOut();
        setState("redirecting");
        router.replace("/login");
        return;
      }

      setState("ready");
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state === "loading" || state === "redirecting") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-zinc-600">
        Checking session…
      </div>
    );
  }

  return <>{children}</>;
}
