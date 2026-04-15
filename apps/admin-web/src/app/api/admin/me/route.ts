import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { canAccessAdminDashboard } from "@marketplace/shared-supabase";

export const dynamic = "force-dynamic";

function extractRoleClaims(authUser: {
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}): string[] {
  const fromApp = authUser.app_metadata ?? {};
  const fromUser = authUser.user_metadata ?? {};

  const candidates: unknown[] = [
    fromApp.roles,
    fromApp.role,
    fromUser.roles,
    fromUser.role,
  ];

  const out = new Set<string>();
  for (const value of candidates) {
    if (Array.isArray(value)) {
      for (const v of value) {
        if (typeof v === "string" && v.trim()) out.add(v.trim());
      }
      continue;
    }
    if (typeof value === "string" && value.trim()) {
      out.add(value.trim());
    }
  }
  return [...out];
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Prefer auth token/app metadata claims first to avoid requiring DB grants
  // during login checks when Prisma is removed.
  const claimedRoles = extractRoleClaims(authUser as never);
  if (canAccessAdminDashboard(claimedRoles)) {
    return NextResponse.json({
      authUserId: authUser.id,
      userId: authUser.id,
      email: authUser.email ?? "",
      roles: claimedRoles,
      onboardingStatus: "UNKNOWN",
      requestedRole: null,
      canAccessAdmin: true,
    });
  }

  let service: ReturnType<typeof createServiceClient>;
  try {
    service = createServiceClient();
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Service-role Supabase client is not configured.",
      },
      { status: 500 },
    );
  }

  const { data: user, error: userErr } = await service
    .from("User")
    .select("id, email, onboardingStatus, requestedRole")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  if (userErr) {
    const msg = userErr.message.toLowerCase();
    if (msg.includes("permission denied")) {
      return NextResponse.json(
        {
          error:
            "Admin account found, but server DB permissions are not configured for role lookup. Set SUPABASE_SERVICE_ROLE_KEY (service_role) in admin env.",
        },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: `Failed to resolve account: ${userErr.message}` },
      { status: 500 },
    );
  }

  if (!user) {
    return NextResponse.json(
      {
        error:
          "No marketplace profile linked to this Supabase account. Run the auth link script after seeding (see docs).",
      },
      { status: 403 },
    );
  }

  const { data: roleLinks, error: roleLinksErr } = await service
    .from("UserRoleAssignment")
    .select("roleId")
    .eq("userId", user.id);

  if (roleLinksErr) {
    return NextResponse.json(
      { error: `Failed to resolve user roles: ${roleLinksErr.message}` },
      { status: 500 },
    );
  }

  const roleIds = (roleLinks ?? []).map((row) => row.roleId).filter(Boolean);
  let roles: string[] = [];
  if (roleIds.length > 0) {
    const { data: roleRows, error: rolesErr } = await service
      .from("Role")
      .select("name")
      .in("id", roleIds);
    if (rolesErr) {
      return NextResponse.json(
        { error: `Failed to resolve role names: ${rolesErr.message}` },
        { status: 500 },
      );
    }
    roles = (roleRows ?? []).map((row) => row.name);
  }

  const canAccessAdmin = canAccessAdminDashboard(roles);

  return NextResponse.json({
    authUserId: authUser.id,
    userId: user.id,
    email: user.email,
    roles,
    onboardingStatus: user.onboardingStatus,
    requestedRole: user.requestedRole,
    canAccessAdmin,
  });
}
