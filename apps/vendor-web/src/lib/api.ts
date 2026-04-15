/**
 * Same-origin `/api/*` route handlers (Prisma + Supabase JWT). Optional
 * `NEXT_PUBLIC_API_URL` for a remote API base (e.g. tunneling).
 */
import { createClient } from "@/lib/supabase/client";

export function getApiBase(): string {
  const env = process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") {
    return env && env.length > 0 ? env : "/api";
  }
  return env && env.length > 0
    ? env
    : process.env.API_INTERNAL_URL ?? "http://127.0.0.1:3000";
}

const API_BASE = getApiBase();

export async function getSupabaseAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/** Ends the Supabase session (vendor portal). */
export async function signOutVendor(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit & { token?: string | null | undefined } = {},
): Promise<T> {
  const { token, headers: initHeaders, ...rest } = init;
  const headers = new Headers(initHeaders);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const auth =
    Object.prototype.hasOwnProperty.call(init, "token") && init.token !== undefined
      ? init.token
      : await getSupabaseAccessToken();
  if (auth) {
    headers.set("Authorization", `Bearer ${auth}`);
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...rest, headers });
  } catch (e) {
    const msg =
      e instanceof TypeError
        ? "Cannot reach the API. Ensure the app is running and NEXT_PUBLIC_SUPABASE_* is set."
        : e instanceof Error
          ? e.message
          : "Network error";
    throw new Error(msg);
  }
  const text = await res.text();
  if (!res.ok) {
    let message = text || res.statusText;
    try {
      const j = JSON.parse(text) as { message?: string | string[] };
      if (typeof j.message === "string") message = j.message;
      else if (Array.isArray(j.message)) message = j.message.join(", ");
    } catch {
      /* plain text */
    }
    throw new Error(message);
  }
  if (!text) return null as T;
  return JSON.parse(text) as T;
}

/** Multipart upload to `POST /storage/upload` (Supabase JWT). */
export async function uploadStorageFile(
  file: File,
  opts: { bucket: "documents" | "profiles" | "stores"; path: string },
  init: { token?: string | null } = {},
): Promise<{ url: string; bucket: string; path: string }> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("bucket", opts.bucket);
  fd.append("path", opts.path);
  const headers = new Headers();
  const auth =
    Object.prototype.hasOwnProperty.call(init, "token") && init.token !== undefined
      ? init.token
      : await getSupabaseAccessToken();
  if (auth) {
    headers.set("Authorization", `Bearer ${auth}`);
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/storage/upload`, { method: "POST", body: fd, headers });
  } catch (e) {
    const msg =
      e instanceof TypeError
        ? "Cannot reach the API for upload. Is the dev server running?"
        : e instanceof Error
          ? e.message
          : "Network error";
    throw new Error(msg);
  }
  const text = await res.text();
  if (!res.ok) {
    let message = text || res.statusText;
    try {
      const j = JSON.parse(text) as { message?: string | string[] };
      if (typeof j.message === "string") message = j.message;
      else if (Array.isArray(j.message)) message = j.message.join(", ");
    } catch {
      /* plain */
    }
    throw new Error(message);
  }
  return JSON.parse(text) as { url: string; bucket: string; path: string };
}
