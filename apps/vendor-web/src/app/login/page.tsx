"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api";
import {
  formatSupabaseAuthError,
  getSupabaseAuthErrorInfo,
  logSupabaseSignup,
} from "@marketplace/shared-supabase";
import type { SupabaseEnvAlignment } from "@/lib/supabaseEnvAlignment";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextRaw = searchParams.get("next");
  const nextPath =
    nextRaw?.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/vendor/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [credHint, setCredHint] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [envCheck, setEnvCheck] = useState<SupabaseEnvAlignment | null>(null);
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);

  const isDev = process.env.NODE_ENV === "development";

  useEffect(() => {
    if (!isDev) return;
    let cancelled = false;
    void fetch("/api/dev/supabase-env-check")
      .then((r) => r.json())
      .then((j: SupabaseEnvAlignment) => {
        if (!cancelled) setEnvCheck(j);
      })
      .catch(() => {
        if (!cancelled) setEnvCheck(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isDev]);

  async function runDevSync() {
    setSyncLoading(true);
    setSyncNote(null);
    try {
      const r = await fetch("/api/dev/sync-seed-auth", { method: "POST" });
      const j = (await r.json()) as {
        ok?: boolean;
        linked?: string[];
        skipped?: string[];
        errors?: { email: string; message: string }[];
        hint?: string;
        message?: string;
      };
      if (!r.ok) {
        const fail = j as {
          message?: string;
          hint?: string;
          env?: SupabaseEnvAlignment;
        };
        if (fail.env?.issues?.length) {
          setSyncNote(
            `${fail.message ?? "Sync blocked"}\n\n${fail.env.issues.join("\n")}\n\nrefs: URL=${fail.env.refs.fromUrl ?? "—"} anon=${fail.env.refs.fromPublishableKey ?? "—"} service=${fail.env.refs.fromServiceRoleKey ?? "—"}`,
          );
        } else {
          setSyncNote(fail.message ?? j.hint ?? `HTTP ${r.status}`);
        }
        return;
      }
      setSyncNote(
        [
          j.linked?.length ? `Linked: ${j.linked.join(", ")}` : null,
          j.skipped?.length ? `Skipped (no DB row): ${j.skipped.join(", ")}` : null,
          j.errors?.length
            ? `Errors: ${j.errors.map((e) => `${e.email}: ${e.message}`).join(" | ")}`
            : null,
          j.hint ?? null,
        ]
          .filter(Boolean)
          .join("\n"),
      );
    } catch (e) {
      setSyncNote(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || inFlight.current) {
      logSupabaseSignup("vendor-login-page", "blocked_duplicate", { reason: "guard" });
      return;
    }
    inFlight.current = true;
    setError(null);
    setCredHint(false);
    setLoading(true);
    logSupabaseSignup("vendor-login-page", "start");
    try {
      const supabase = createClient();
      const { data, error: signErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signErr) throw signErr;
      const token = data.session?.access_token;
      if (!token) throw new Error("No session returned");
      await apiFetch("/profile/bootstrap", { method: "POST", body: "{}", token });
      logSupabaseSignup("vendor-login-page", "success");
      router.replace(nextPath);
    } catch (err) {
      const info = getSupabaseAuthErrorInfo(err);
      logSupabaseSignup("vendor-login-page", "error", {
        status: info.status,
        code: info.code,
        message: info.message,
        raw: info.raw,
      });
      setError(formatSupabaseAuthError(err));
      setCredHint(
        info.code === "invalid_credentials" ||
          info.message.toLowerCase().includes("invalid login"),
      );
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fdfcfb] flex flex-col items-center justify-center p-6">
      <div className="absolute top-8 left-8">
        <Link
          href="/"
          className="flex items-center text-sm font-medium text-gray-500 hover:text-black transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Home
        </Link>
      </div>

      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Vendor sign in</h1>
          <p className="text-sm text-gray-500">
            Use the email and password for your marketplace vendor account.
          </p>
        </div>

        {isDev && envCheck && !envCheck.aligned && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-left text-xs text-red-900 space-y-2"
          >
            <p className="font-semibold">Supabase environment mismatch</p>
            <p className="text-red-800/90">
              Sign-in uses your <strong>anon</strong> key; the sync script uses the <strong>service role</strong> key.
              They must be from the <strong>same</strong> project as <code className="rounded bg-white/80 px-1">NEXT_PUBLIC_SUPABASE_URL</code>.
            </p>
            <ul className="list-disc space-y-1 pl-4 text-red-800/90">
              {envCheck.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
            <p className="font-mono text-[10px] text-red-900/80">
              URL ref: {envCheck.refs.fromUrl ?? "—"} · anon: {envCheck.refs.fromPublishableKey ?? "—"} · service:{" "}
              {envCheck.refs.fromServiceRoleKey ?? "—"}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <div className="space-y-2">
            <label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-gray-400">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:ring-1 focus:ring-black"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-gray-400">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:ring-1 focus:ring-black"
            />
          </div>
          {error && (
            <div className="space-y-2">
              <p className="text-sm text-red-600">{error}</p>
              {credHint && (
                <div className="text-xs leading-relaxed text-gray-600 rounded-lg bg-gray-50 p-3 border border-gray-100 space-y-2">
                  <p>
                    Supabase Auth must have the same user as your seeded DB. From repo root: run{" "}
                    <code className="rounded bg-white px-1 text-[11px]">pnpm db:seed</code>, then in
                    PowerShell:{" "}
                    <code className="block mt-1 break-all rounded bg-white px-2 py-1 text-[11px]">
                      $env:LINK_RESET_AUTH_PASSWORD=&quot;1&quot;; pnpm exec tsx scripts/link-supabase-auth.ts
                    </code>
                  </p>
                  <p>
                    Demo vendor: <code className="text-[11px]">vendor@example.com</code> /{" "}
                    <code className="text-[11px]">ChangeMe123!</code>
                  </p>
                  {isDev && (
                    <p className="text-[11px] text-gray-700 border-t border-gray-200 pt-3">
                      You can also use the sync button below (needs service role in{" "}
                      <code className="rounded bg-white px-1">.env.local</code>).
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full luxury-button py-3 flex justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Sign in
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          New vendor?{" "}
          <Link href="/register/choice" className="font-medium text-gray-900 underline underline-offset-4">
            Start registration
          </Link>
        </p>

        {isDev && (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white/80 p-4 text-center space-y-2">
            <p className="text-[11px] text-gray-500">Local dev — seed DB + Supabase Auth out of sync?</p>
            <button
              type="button"
              onClick={() => void runDevSync()}
              disabled={syncLoading}
              className="text-[11px] font-medium text-gray-900 underline underline-offset-2 hover:text-black disabled:opacity-50"
            >
              {syncLoading ? "Syncing seed users…" : "Sync seed users to Supabase Auth (demo password)"}
            </button>
            {syncNote && (
              <pre className="max-h-36 overflow-auto whitespace-pre-wrap rounded border border-gray-100 bg-gray-50 p-2 text-left text-[10px] text-gray-800">
                {syncNote}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="min-h-screen bg-[#fdfcfb] flex items-center justify-center p-6">
      <Loader2 className="w-8 h-8 animate-spin text-gray-300" aria-hidden />
    </div>
  );
}

export default function VendorLoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
