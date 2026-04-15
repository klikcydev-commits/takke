import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@marketplace/marketplace-server";
import { canAccessAdminDashboard } from "@marketplace/shared-supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { authUserId: authUser.id },
    include: {
      roles: { include: { role: true } },
    },
  });

  if (!user) {
    return NextResponse.json(
      {
        error:
          "No marketplace profile linked to this Supabase account. Run the auth link script after seeding (see docs).",
      },
      { status: 403 },
    );
  }

  const roles = user.roles.map((r) => r.role.name);
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
