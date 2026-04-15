import { NextRequest, NextResponse } from "next/server";
import { getBearerAppUser } from "@/lib/auth/bearerAppUser";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveDriverForSlug } from "@/lib/driver/resolveDriverForSlug";
import { getAssignmentDetailForDriver } from "@/lib/driver/loadAssignmentViews";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ assignmentId: string }> },
) {
  const user = await getBearerAppUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { assignmentId } = await ctx.params;
  const driverSlug = req.nextUrl.searchParams.get("driverSlug");
  const sb = createServiceClient();
  const scoped = await resolveDriverForSlug(sb, driverSlug, user.appUserId);
  if (!scoped) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const detail = await getAssignmentDetailForDriver(sb, scoped.driver.id, assignmentId, {
    allowUnassignedPool: true,
  });
  if (!detail) return NextResponse.json({ message: "Not found" }, { status: 404 });

  return NextResponse.json(detail);
}
