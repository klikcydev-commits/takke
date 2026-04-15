import type { Profile } from "@/ctx/AuthContext";
import { supabase } from "@/utils/supabase";
import {
  formatSupabaseAuthError,
  getSupabaseAuthErrorInfo,
  logSupabaseSignup,
} from "@marketplace/shared-supabase";

/** Axios base URL for vendor-web `/api/*` (must end with `/` for relative paths). */
export function getMarketplaceApiBase(): string {
  const raw = process.env.EXPO_PUBLIC_VENDOR_API_URL?.trim();
  let root =
    raw && raw.length > 0 ? raw.replace(/\/$/, "") : "http://127.0.0.1:3000/api";
  if (!root.endsWith("/api")) {
    root = `${root}/api`;
  }
  return `${root}/`;
}

async function bootstrapProfile(accessToken: string) {
  const res = await fetch(new URL("profile/bootstrap", getMarketplaceApiBase()), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(j.message || "Could not link marketplace profile");
  }
}

/**
 * Supabase Auth + Prisma profile link. Tries sign-in first, then sign-up for new accounts.
 */
export async function ensureMarketplaceSession(email: string, password: string) {
  const trimmed = email.trim();
  logSupabaseSignup("mobile-ensure-session", "start");
  const signIn = await supabase.auth.signInWithPassword({
    email: trimmed,
    password,
  });

  let session = signIn.data.session;

  if (signIn.error) {
    if (signIn.error.status === 429) {
      const info = getSupabaseAuthErrorInfo(signIn.error);
      logSupabaseSignup("mobile-ensure-session", "error", {
        step: "signIn",
        status: info.status,
        raw: info.raw,
      });
      throw new Error(formatSupabaseAuthError(signIn.error));
    }
    const up = await supabase.auth.signUp({ email: trimmed, password });
    if (up.error) {
      const info = getSupabaseAuthErrorInfo(up.error);
      logSupabaseSignup("mobile-ensure-session", "error", {
        step: "signUp",
        status: info.status,
        raw: info.raw,
      });
      throw new Error(formatSupabaseAuthError(up.error));
    }
    session = up.data.session;
    if (!session?.access_token) {
      logSupabaseSignup("mobile-ensure-session", "success", { pendingEmailConfirm: true });
      throw new Error(
        "Check your email to confirm your account, or disable email confirmation in Supabase for local dev.",
      );
    }
  } else if (!session?.access_token) {
    throw new Error("No session");
  }

  logSupabaseSignup("mobile-ensure-session", "success");
  await bootstrapProfile(session.access_token);
  return session;
}

/** Load Prisma-linked customer profile (roles, name, onboarding flags). */
export async function fetchCustomerProfile(accessToken: string): Promise<Profile> {
  const res = await fetch(new URL("profile/me", getMarketplaceApiBase()), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(typeof j.message === "string" ? j.message : "Could not load profile");
  }
  return {
    id: String(j.id ?? ""),
    full_name: j.full_name != null ? String(j.full_name) : null,
    avatar_url: j.avatar_url != null ? String(j.avatar_url) : null,
    phone: j.phone != null ? String(j.phone) : null,
    role:
      j.role === "vendor" || j.role === "courier" || j.role === "buyer"
        ? j.role
        : "buyer",
    onboarding_completed: j.onboarding_completed === true,
    is_premium: j.is_premium === true,
    premium_expires_at:
      j.premium_expires_at != null ? String(j.premium_expires_at) : null,
    created_at: String(j.created_at ?? new Date().toISOString()),
    updated_at: String(j.updated_at ?? new Date().toISOString()),
    is_admin: j.is_admin === true,
  };
}

/** Persist onboarding name + completion (Prisma `UserProfile`). */
export async function patchCustomerProfile(
  accessToken: string,
  body: { display_name: string; onboarding_completed?: boolean },
): Promise<Profile> {
  const res = await fetch(new URL("profile/me", getMarketplaceApiBase()), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      display_name: body.display_name,
      onboarding_completed: body.onboarding_completed ?? true,
    }),
  });
  const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(typeof j.message === "string" ? j.message : "Could not save profile");
  }
  return {
    id: String(j.id ?? ""),
    full_name: j.full_name != null ? String(j.full_name) : null,
    avatar_url: j.avatar_url != null ? String(j.avatar_url) : null,
    phone: j.phone != null ? String(j.phone) : null,
    role:
      j.role === "vendor" || j.role === "courier" || j.role === "buyer"
        ? j.role
        : "buyer",
    onboarding_completed: j.onboarding_completed === true,
    is_premium: j.is_premium === true,
    premium_expires_at:
      j.premium_expires_at != null ? String(j.premium_expires_at) : null,
    created_at: String(j.created_at ?? new Date().toISOString()),
    updated_at: String(j.updated_at ?? new Date().toISOString()),
    is_admin: j.is_admin === true,
  };
}
