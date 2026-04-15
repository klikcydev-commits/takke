import { NextRequest, NextResponse } from "next/server";
import { getBearerAppUser } from "@/lib/auth/bearerAppUser";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveDriverForSlug } from "@/lib/driver/resolveDriverForSlug";
import { listHistoryForDriver } from "@/lib/driver/loadAssignmentViews";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getBearerAppUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const driverSlug = req.nextUrl.searchParams.get("driverSlug");
  const take = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("take") ?? "40")));

  const sb = createServiceClient();
  const scoped = await resolveDriverForSlug(sb, driverSlug, user.appUserId);
  if (!scoped) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const items = await listHistoryForDriver(sb, scoped.driver.id, take);
  return NextResponse.json({ assignments: items });
}
