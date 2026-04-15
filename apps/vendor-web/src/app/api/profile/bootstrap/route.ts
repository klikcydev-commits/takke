import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ensureVendorApiEnvLoaded } from "@/lib/loadVendorApiEnv";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Server error";
}

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

/** Links Supabase Auth user to marketplace `User` row and ensures CUSTOMER role. */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const token = auth.slice(7);
  try {
    const { url, anon, service } = getConfig();
    const authClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authErr } = await authClient.auth.getUser(token);
    if (authErr || !authData.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const email = authData.user.email?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json(
        { message: "Authenticated account is missing an email." },
        { status: 400 },
      );
    }

    const sb = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const emailVerified = !!authData.user.email_confirmed_at;
    const now = new Date().toISOString();

    const { data: byAuth, error: byAuthErr } = await sb
      .from("User")
      .select("id, email")
      .eq("auth_user_id", authData.user.id)
      .maybeSingle();
    if (byAuthErr) throw new Error(byAuthErr.message);
    if (byAuth) {
      const { error: syncErr } = await sb
        .from("User")
        .update({
          email,
          isEmailVerified: emailVerified,
          updatedAt: now,
        })
        .eq("id", byAuth.id);
      if (syncErr) throw new Error(syncErr.message);
      return NextResponse.json({ id: byAuth.id, email });
    }

    const { data: byEmail, error: byEmailErr } = await sb
      .from("User")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();
    if (byEmailErr) throw new Error(byEmailErr.message);
    if (byEmail) {
      const { error: linkErr } = await sb
        .from("User")
        .update({
          auth_user_id: authData.user.id,
          email,
          isEmailVerified: emailVerified,
          updatedAt: now,
        })
        .eq("id", byEmail.id);
      if (linkErr) throw new Error(linkErr.message);
      return NextResponse.json({ id: byEmail.id, email });
    }

    const { data: customerRole, error: roleErr } = await sb
      .from("Role")
      .select("id")
      .eq("name", "CUSTOMER")
      .maybeSingle();
    if (roleErr) throw new Error(roleErr.message);
    if (!customerRole?.id) {
      return NextResponse.json(
        { message: "CUSTOMER role is missing in database." },
        { status: 500 },
      );
    }

    const userId = crypto.randomUUID();
    const { error: createUserErr } = await sb.from("User").insert({
      id: userId,
      email,
      auth_user_id: authData.user.id,
      updatedAt: now,
      isEmailVerified: emailVerified,
      onboardingStatus: "NONE",
    });
    if (createUserErr) throw new Error(createUserErr.message);

    const { error: roleAssignErr } = await sb.from("UserRoleAssignment").insert({
      id: crypto.randomUUID(),
      userId,
      roleId: customerRole.id,
    });
    if (roleAssignErr) throw new Error(roleAssignErr.message);

    return NextResponse.json({ id: userId, email });
  } catch (e) {
    return NextResponse.json({ message: errMessage(e) }, { status: 500 });
  }
}
