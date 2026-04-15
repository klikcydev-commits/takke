import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ensureVendorApiEnvLoaded } from "@/lib/loadVendorApiEnv";

function getConfig() {
  ensureVendorApiEnvLoaded();
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? process.env.SUPABASE_URL?.trim() ?? "";
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_KEY?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ??
    "";
  const service =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ??
    process.env.SUPABASE_SECRET_KEY?.trim() ??
    "";
  if (!url || !anon || !service) {
    throw new Error("Missing Supabase config (URL, anon key, service role key).");
  }
  return { url, anon, service };
}

export type BearerAppUser = {
  authUserId: string;
  appUserId: string;
};

/** Resolves Supabase JWT + marketplace `User.id` from `Authorization: Bearer`. */
export async function getBearerAppUser(req: NextRequest): Promise<BearerAppUser | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const { url, anon, service } = getConfig();
  const authClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authErr } = await authClient.auth.getUser(token);
  if (authErr || !authData.user?.id) return null;

  const sb = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: user, error: userErr } = await sb
    .from("User")
    .select("id")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();
  if (userErr || !user?.id) return null;

  return { authUserId: authData.user.id, appUserId: user.id };
}
