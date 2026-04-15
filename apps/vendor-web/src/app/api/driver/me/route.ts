import { NextRequest, NextResponse } from "next/server";
import { getBearerAppUser } from "@/lib/auth/bearerAppUser";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveMarketplaceAccess } from "@/lib/access/resolveMarketplaceAccess";
import { encodeDriverSlug } from "@/lib/driver/driverSlug";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getBearerAppUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const sb = createServiceClient();
  const access = await resolveMarketplaceAccess(user.authUserId);
  if (!access) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { data: driver } = await sb
    .from("Driver")
    .select("id, userId, vehicleType, licensePlate, isActive, metadata, createdAt, updatedAt")
    .eq("userId", user.appUserId)
    .maybeSingle();

  const { data: profile } = await sb
    .from("UserProfile")
    .select("firstName, lastName, phone, avatarUrl, metadata")
    .eq("userId", user.appUserId)
    .maybeSingle();

  const { data: driverAppRows } = await sb
    .from("DriverApplication")
    .select("*")
    .eq("userId", user.appUserId)
    .order("createdAt", { ascending: false })
    .limit(1);
  const driverApp = driverAppRows?.[0] ?? null;

  const dashboardBasePath = driver?.id
    ? `/driver/d/${encodeDriverSlug(driver.id)}/dashboard`
    : null;

  return NextResponse.json({
    appUserId: user.appUserId,
    access: {
      roles: access.roles,
      requestedRole: access.requestedRole,
      onboardingStatus: access.onboardingStatus,
      driverApplicationStatus: access.driverApplicationStatus,
      storeApplicationStatus: access.storeApplicationStatus,
    },
    driver: driver ?? null,
    dashboardBasePath,
    profile: profile ?? null,
    driverApplication: driverApp ?? null,
  });
}
