"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { AdminMeResponse } from "@marketplace/shared-supabase";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const supabase = createClient();
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signErr) {
        const code =
          "code" in signErr && typeof (signErr as { code?: string }).code === "string"
            ? (signErr as { code: string }).code
            : "";
        const base = signErr.message || "Sign in failed";
        if (code === "email_not_confirmed") {
          setError(
            `${base} Run pnpm db:link-supabase-auth (confirms email via Admin API), or confirm the user in Supabase → Authentication → Users.`,
          );
          return;
        }
        const looksWrongPw =
          /invalid login|invalid credentials/i.test(base) ||
          code === "invalid_credentials";
        setError(
          looksWrongPw
            ? `${base}${code ? ` [${code}]` : ""} — Use password ChangeMe123! after linking. From repo root: pnpm db:seed && pnpm db:link-supabase-auth. If the user already existed: LINK_RESET_AUTH_PASSWORD=1 pnpm db:link-supabase-auth`
            : `${base}${code ? ` (${code})` : ""}`,
        );
        return;
      }

      const meRes = await fetch("/api/admin/me", { credentials: "include" });
      const me = (await meRes.json().catch(() => ({}))) as AdminMeResponse & {
        error?: string;
      };

      if (!meRes.ok) {
        await supabase.auth.signOut();
        setError(
          me.error ??
            (meRes.status === 403
              ? "No marketplace profile linked to this account, or access denied. Use the link script after seed (see README)."
              : "Could not verify admin access."),
        );
        return;
      }

      if (!me.canAccessAdmin) {
        await supabase.auth.signOut();
        setError("This account does not have admin access (ADMIN or SUPER_ADMIN required).");
        return;
      }

      router.push("/dashboard/applications");
      router.refresh();
    } catch (err: unknown) {
      console.error("[admin login]", err);
      if (err instanceof TypeError) {
        setError(
          "Could not reach this app’s API (e.g. /api/admin/me). Keep the dev server running, use http://localhost:3002 for admin, and set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in repo root .env / .env.local.",
        );
        return;
      }
      if (err instanceof Error) {
        const m = err.message;
        if (m.includes("NEXT_PUBLIC_SUPABASE")) {
          setError(m);
          return;
        }
        setError(m || "Sign in failed unexpectedly.");
        return;
      }
      setError(
        "Network error. Set NEXT_PUBLIC_SUPABASE_URL and publishable key, then run: pnpm db:seed && pnpm db:link-supabase-auth",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">Admin sign in</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Sign in with Supabase Auth. Account must be linked to a profile with ADMIN or SUPER_ADMIN.
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="text-sm font-medium text-zinc-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium text-zinc-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2"
            />
          </div>

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          <Link href="/" className="text-zinc-700 underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
