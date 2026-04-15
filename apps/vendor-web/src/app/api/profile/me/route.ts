import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ensureVendorApiEnvLoaded } from "@/lib/loadVendorApiEnv";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Server error";
}

type UiRole = "buyer" | "vendor" | "courier";

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
  if (!url || !anon || !service) throw new Error("Supabase config is missing.");
  return { url, anon, service };
}

async function resolveIdentity(req: NextRequest): Promise<{
  appUserId: string;
  authUserId: string;
  email: string;
}> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const token = auth.slice(7);
  const { url, anon, service } = getConfig();
  const authClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authErr } = await authClient.auth.getUser(token);
  if (authErr || !authData.user?.id) throw new Error("Unauthorized");
  const email = authData.user.email?.trim().toLowerCase();
  if (!email) throw new Error("Authenticated account has no email.");

  const emailVerified = !!authData.user.email_confirmed_at;

  const sb = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const now = new Date().toISOString();
  const { data: byAuth, error: byAuthErr } = await sb
    .from("User")
    .select("id")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();
  if (byAuthErr) throw new Error(byAuthErr.message);
  if (byAuth?.id) {
    const { error: syncErr } = await sb
      .from("User")
      .update({
        email,
        isEmailVerified: emailVerified,
        updatedAt: now,
      })
      .eq("id", byAuth.id);
    if (syncErr) throw new Error(syncErr.message);
    return { appUserId: byAuth.id, authUserId: authData.user.id, email };
  }

  const { data: byEmail, error: byEmailErr } = await sb
    .from("User")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (byEmailErr) throw new Error(byEmailErr.message);
  if (byEmail?.id) {
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
    return { appUserId: byEmail.id, authUserId: authData.user.id, email };
  }

  const { data: role, error: roleErr } = await sb
    .from("Role")
    .select("id")
    .eq("name", "CUSTOMER")
    .maybeSingle();
  if (roleErr) throw new Error(roleErr.message);
  if (!role?.id) throw new Error("CUSTOMER role missing.");

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
    roleId: role.id,
  });
  if (roleAssignErr) throw new Error(roleAssignErr.message);

  return { appUserId: userId, authUserId: authData.user.id, email };
}

async function buildProfileDto(userId: string, email: string) {
  const { url, service } = getConfig();
  const sb = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const now = new Date().toISOString();

  const { data: profile, error: profileErr } = await sb
    .from("UserProfile")
    .select("*")
    .eq("userId", userId)
    .maybeSingle();
  if (profileErr) throw new Error(profileErr.message);

  let current = profile;
  if (!current) {
    const seedName = email.split("@")[0] ?? "there";
    const { error: createProfileErr } = await sb.from("UserProfile").insert({
      id: crypto.randomUUID(),
      userId,
      firstName: seedName,
      lastName: "",
      updatedAt: now,
    });
    if (createProfileErr) throw new Error(createProfileErr.message);
    const { data: created, error: createdErr } = await sb
      .from("UserProfile")
      .select("*")
      .eq("userId", userId)
      .maybeSingle();
    if (createdErr || !created) throw new Error(createdErr?.message ?? "Profile bootstrap failed.");
    current = created;
  }

  const { data: links, error: linksErr } = await sb
    .from("UserRoleAssignment")
    .select("roleId")
    .eq("userId", userId);
  if (linksErr) throw new Error(linksErr.message);
  const roleIds = (links ?? []).map((r) => r.roleId).filter(Boolean);
  let role: UiRole = "buyer";
  let isAdmin = false;
  if (roleIds.length > 0) {
    const { data: roles, error: rolesErr } = await sb
      .from("Role")
      .select("name")
      .in("id", roleIds);
    if (rolesErr) throw new Error(rolesErr.message);
    const names = (roles ?? []).map((r) => r.name);
    if (names.includes("STORE_OWNER")) role = "vendor";
    else if (names.includes("DELIVERY_DRIVER")) role = "courier";
    isAdmin = names.includes("ADMIN") || names.includes("SUPER_ADMIN");
  }

  const meta = (current.metadata as Record<string, unknown> | null) ?? {};
  const fullName = `${current.firstName ?? ""} ${current.lastName ?? ""}`.trim();
  return {
    id: userId,
    full_name: fullName || null,
    avatar_url: current.avatarUrl,
    phone: current.phone,
    role,
    onboarding_completed: meta.onboarding_completed === true,
    is_premium: meta.is_premium === true,
    premium_expires_at:
      typeof meta.premium_expires_at === "string" ? meta.premium_expires_at : null,
    created_at: current.createdAt ?? now,
    updated_at: current.updatedAt ?? now,
    is_admin: isAdmin,
  };
}

export async function GET(req: NextRequest) {
  try {
    const identity = await resolveIdentity(req);
    return NextResponse.json(await buildProfileDto(identity.appUserId, identity.email));
  } catch (e) {
    const msg = errMessage(e);
    const status = msg === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ message: msg }, { status });
  }
}

/** Update display name, phone, onboarding flag (mobile onboarding screen). */
export async function PATCH(req: NextRequest) {
  let appUserId: string;
  let email: string;
  try {
    const identity = await resolveIdentity(req);
    appUserId = identity.appUserId;
    email = identity.email;
  } catch (e) {
    const msg = errMessage(e);
    const status = msg === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ message: msg }, { status });
  }

  let body: unknown;
  try {
    const text = await req.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const b = body as {
    display_name?: string;
    phone?: string | null;
    onboarding_completed?: boolean;
  };

  try {
    const { url, service } = getConfig();
    const sb = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: existing, error: existingErr } = await sb
      .from("UserProfile")
      .select("*")
      .eq("userId", appUserId)
      .maybeSingle();
    if (existingErr) throw new Error(existingErr.message);
    if (!existing) throw new Error("Profile not found");

    let firstName = existing.firstName;
    let lastName = existing.lastName;
    if (typeof b.display_name === "string" && b.display_name.trim()) {
      const parts = b.display_name.trim().split(/\s+/);
      firstName = parts[0] ?? firstName;
      lastName = parts.slice(1).join(" ");
    }
    const metadata = {
      ...((existing.metadata as Record<string, unknown> | null) ?? {}),
      ...(typeof b.onboarding_completed === "boolean"
        ? { onboarding_completed: b.onboarding_completed }
        : {}),
    };
    const { error: updateErr } = await sb
      .from("UserProfile")
      .update({
        firstName,
        lastName,
        ...(b.phone !== undefined ? { phone: b.phone } : {}),
        metadata,
        updatedAt: new Date().toISOString(),
      })
      .eq("userId", appUserId);
    if (updateErr) throw new Error(updateErr.message);

    return NextResponse.json(await buildProfileDto(appUserId, email));
  } catch (e) {
    return NextResponse.json({ message: errMessage(e) }, { status: 400 });
  }
}
