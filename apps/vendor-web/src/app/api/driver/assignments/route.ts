import { NextRequest, NextResponse } from "next/server";
import { getBearerAppUser } from "@/lib/auth/bearerAppUser";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveDriverForSlug } from "@/lib/driver/resolveDriverForSlug";
import { listAssignmentsForDriver } from "@/lib/driver/loadAssignmentViews";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getBearerAppUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const driverSlug = req.nextUrl.searchParams.get("driverSlug");
  const mode = (req.nextUrl.searchParams.get("mode") ?? "all") as "active" | "available" | "all";
  if (!["active", "available", "all"].includes(mode)) {
    return NextResponse.json({ message: "Invalid mode" }, { status: 400 });
  }

  const sb = createServiceClient();
  const scoped = await resolveDriverForSlug(sb, driverSlug, user.appUserId);
  if (!scoped) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const items = await listAssignmentsForDriver(sb, scoped.driver.id, mode);
  return NextResponse.json({ assignments: items });
}
