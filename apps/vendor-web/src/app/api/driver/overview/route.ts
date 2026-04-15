import { NextRequest, NextResponse } from "next/server";
import { getBearerAppUser } from "@/lib/auth/bearerAppUser";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveDriverForSlug } from "@/lib/driver/resolveDriverForSlug";
import { listAssignmentsForDriver } from "@/lib/driver/loadAssignmentViews";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function startOfDayIso(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}

function startOfWeekIso(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = x.getDate() - day + (day === 0 ? -6 : 1);
  x.setDate(diff);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}

export async function GET(req: NextRequest) {
  const user = await getBearerAppUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const driverSlug = req.nextUrl.searchParams.get("driverSlug");
  const sb = createServiceClient();
  const scoped = await resolveDriverForSlug(sb, driverSlug, user.appUserId);
  if (!scoped) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { driver } = scoped;
  const terminal = new Set(["DELIVERED", "FAILED", "REJECTED"]);

  const { data: mine } = await sb
    .from("DeliveryAssignment")
    .select("id, status, updatedAt, createdAt")
    .eq("driverId", driver.id);

  const rows = mine ?? [];
  const active = rows.filter((r) => !terminal.has(r.status));
  const completed = rows.filter((r) => r.status === "DELIVERED" || r.status === "FAILED");

  const now = new Date();
  const sod = startOfDayIso(now);
  const sow = startOfWeekIso(now);

  const completedToday = completed.filter((r) => r.updatedAt >= sod).length;
  const completedWeek = completed.filter((r) => r.updatedAt >= sow).length;

  const pendingPickup = rows.filter(
    (r) =>
      !terminal.has(r.status) &&
      ["ACCEPTED", "ASSIGNED", "PICKUP_ARRIVED"].includes(r.status),
  ).length;

  const [activeList, poolList] = await Promise.all([
    listAssignmentsForDriver(sb, driver.id, "active"),
    listAssignmentsForDriver(sb, driver.id, "available"),
  ]);

  const recent = activeList.slice(0, 5);

  return NextResponse.json({
    driver: {
      id: driver.id,
      isActive: driver.isActive,
      vehicleType: driver.vehicleType,
      licensePlate: driver.licensePlate,
    },
    stats: {
      activeAssignments: active.length,
      availableToClaim: poolList.length,
      completedLifetime: completed.length,
      completedToday,
      completedThisWeek: completedWeek,
      pendingPickup,
    },
    recentAssignments: recent,
  });
}
