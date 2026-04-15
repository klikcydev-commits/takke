import type { Json, RoleTypeEnum } from "@marketplace/supabase-db-types";
import { prisma } from "./prisma.js";
import { getServiceRoleSupabase } from "./supabaseServiceRole.js";

/** Shape consumed by the mobile app (`AuthContext.Profile`). */
export type CustomerProfileMeDto = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: "buyer" | "vendor" | "courier";
  onboarding_completed: boolean;
  is_premium: boolean;
  premium_expires_at: string | null;
  created_at: string;
  updated_at: string;
  is_admin: boolean;
};

function mapUiRole(roles: RoleTypeEnum[]): "buyer" | "vendor" | "courier" {
  if (roles.includes("STORE_OWNER")) return "vendor";
  if (roles.includes("DELIVERY_DRIVER")) return "courier";
  return "buyer";
}

function isAdminRole(roles: RoleTypeEnum[]): boolean {
  return roles.some((r) => r === "ADMIN" || r === "SUPER_ADMIN");
}

function nowIso(): string {
  return new Date().toISOString();
}

async function fetchRoleNamesForUser(userId: string): Promise<RoleTypeEnum[]> {
  const sb = getServiceRoleSupabase();
  const { data: links, error: le } = await sb
    .from("UserRoleAssignment")
    .select("roleId")
    .eq("userId", userId);
  if (le) throw new Error(le.message);
  const ids = (links ?? []).map((r) => r.roleId).filter(Boolean);
  if (ids.length === 0) return [];
  const { data: roles, error: re } = await sb
    .from("Role")
    .select("name")
    .in("id", ids);
  if (re) throw new Error(re.message);
  return (roles ?? []).map((r) => r.name as RoleTypeEnum);
}

async function buildDto(userId: string): Promise<CustomerProfileMeDto> {
  const sb = getServiceRoleSupabase();
  const { data: user, error: ue } = await sb
    .from("User")
    .select("id, createdAt")
    .eq("id", userId)
    .maybeSingle();
  if (ue) throw new Error(ue.message);
  if (!user) throw new Error("User not found");

  const { data: prof, error: pe } = await sb
    .from("UserProfile")
    .select("*")
    .eq("userId", userId)
    .maybeSingle();
  if (pe) throw new Error(pe.message);
  if (!prof) throw new Error("Profile not found");

  const roleNames = await fetchRoleNamesForUser(userId);
  const meta = (prof.metadata as Record<string, unknown> | null) ?? {};
  const onboarding_completed = meta.onboarding_completed === true;
  const is_premium = meta.is_premium === true;
  const premium_expires_at =
    typeof meta.premium_expires_at === "string" ? meta.premium_expires_at : null;

  const fullName = [prof.firstName, prof.lastName]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");

  return {
    id: user.id,
    full_name: fullName || null,
    avatar_url: prof.avatarUrl,
    phone: prof.phone,
    role: mapUiRole(roleNames),
    onboarding_completed,
    is_premium,
    premium_expires_at,
    created_at: user.createdAt,
    updated_at: prof.updatedAt,
    is_admin: isAdminRole(roleNames),
  };
}

/**
 * Resolve internal app `User.id` from Supabase Auth `sub` (JWT).
 * Uses Prisma so admin/mobile server routes do not depend on PostgREST for this lookup.
 */
export async function findAppUserIdByAuthUserId(
  authUserId: string,
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { authUserId },
    select: { id: true },
  });
  return user?.id ?? null;
}

/**
 * Ensure a `User` row exists for a Supabase Auth user; link by email or create with CUSTOMER role.
 */
export async function ensureLinkedAppUser(input: {
  authUserId: string;
  email: string;
}): Promise<{ id: string; email: string }> {
  const sb = getServiceRoleSupabase();
  const email = input.email.trim().toLowerCase();

  const { data: byAuth, error: e1 } = await sb
    .from("User")
    .select("id, email")
    .eq("auth_user_id", input.authUserId)
    .maybeSingle();
  if (e1) throw new Error(e1.message);
  if (byAuth) return { id: byAuth.id, email: byAuth.email };

  const { data: byEmail, error: e2 } = await sb
    .from("User")
    .select("id, email")
    .eq("email", email)
    .maybeSingle();
  if (e2) throw new Error(e2.message);
  if (byEmail) {
    const t = nowIso();
    const { error: e3 } = await sb
      .from("User")
      .update({ auth_user_id: input.authUserId, updatedAt: t })
      .eq("id", byEmail.id);
    if (e3) throw new Error(e3.message);
    return { id: byEmail.id, email: byEmail.email };
  }

  const { data: customerRole, error: re } = await sb
    .from("Role")
    .select("id")
    .eq("name", "CUSTOMER")
    .maybeSingle();
  if (re) throw new Error(re.message);
  if (!customerRole?.id) {
    throw new Error("CUSTOMER role missing — run database seed.");
  }

  const userId = crypto.randomUUID();
  const t = nowIso();
  const { error: ie } = await sb.from("User").insert({
    id: userId,
    email,
    auth_user_id: input.authUserId,
    updatedAt: t,
    isEmailVerified: false,
    onboardingStatus: "NONE",
  });
  if (ie) throw new Error(ie.message);

  const { error: rae } = await sb.from("UserRoleAssignment").insert({
    id: crypto.randomUUID(),
    userId,
    roleId: customerRole.id,
  });
  if (rae) throw new Error(rae.message);

  return { id: userId, email };
}

export async function getCustomerProfileForAccessTokenClaims(
  authUserId: string,
  emailFromJwt: string | undefined,
): Promise<CustomerProfileMeDto> {
  const sb = getServiceRoleSupabase();
  const { data: existing } = await sb
    .from("User")
    .select("email")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  const resolved =
    emailFromJwt?.trim().toLowerCase() || existing?.email?.toLowerCase();
  if (!resolved) {
    throw new Error(
      "Cannot resolve account email. Ensure the access token includes an email claim or complete sign-in once.",
    );
  }

  const { id: userId } = await ensureLinkedAppUser({
    authUserId,
    email: resolved,
  });

  const { data: hasProf } = await sb
    .from("UserProfile")
    .select("id")
    .eq("userId", userId)
    .maybeSingle();
  if (!hasProf) {
    const local = resolved.split("@")[0] ?? "there";
    const pid = crypto.randomUUID();
    const t = nowIso();
    const { error: perr } = await sb.from("UserProfile").insert({
      id: pid,
      userId,
      firstName: local,
      lastName: "",
      updatedAt: t,
    });
    if (perr) throw new Error(perr.message);
  }

  return buildDto(userId);
}

export async function patchCustomerProfileMe(
  appUserId: string,
  input: {
    display_name?: string;
    phone?: string | null;
    onboarding_completed?: boolean;
  },
): Promise<CustomerProfileMeDto> {
  const sb = getServiceRoleSupabase();
  const { data: prof, error: pe } = await sb
    .from("UserProfile")
    .select("*")
    .eq("userId", appUserId)
    .maybeSingle();
  if (pe) throw new Error(pe.message);
  if (!prof) throw new Error("User not found");

  let firstName = prof.firstName;
  let lastName = prof.lastName;
  if (typeof input.display_name === "string") {
    const t = input.display_name.trim();
    if (t.length > 0) {
      const parts = t.split(/\s+/);
      firstName = parts[0] ?? firstName;
      lastName = parts.slice(1).join(" ");
    }
  }

  const meta: Record<string, unknown> = {
    ...((prof.metadata as Record<string, unknown> | null) ?? {}),
  };
  if (typeof input.onboarding_completed === "boolean") {
    meta.onboarding_completed = input.onboarding_completed;
  }

  const t = nowIso();
  const { error: ue } = await sb
    .from("UserProfile")
    .update({
      firstName,
      lastName,
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      metadata: meta as Json,
      updatedAt: t,
    })
    .eq("userId", appUserId);
  if (ue) throw new Error(ue.message);

  return buildDto(appUserId);
}
