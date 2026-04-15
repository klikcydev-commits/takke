import { NextRequest, NextResponse } from "next/server";
import { getBearerAppUser } from "@/lib/auth/bearerAppUser";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveDriverForSlug } from "@/lib/driver/resolveDriverForSlug";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getBearerAppUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const driverSlug = req.nextUrl.searchParams.get("driverSlug");
  const sb = createServiceClient();
  const scoped = await resolveDriverForSlug(sb, driverSlug, user.appUserId);
  if (!scoped) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { data: profile } = await sb
    .from("UserProfile")
    .select("firstName, lastName, phone, avatarUrl, metadata")
    .eq("userId", user.appUserId)
    .maybeSingle();

  const meta = (scoped.driver.metadata as Record<string, unknown> | null) ?? {};
  return NextResponse.json({
    driver: scoped.driver,
    profile: profile ?? null,
    notificationEmailOptIn: meta.notificationEmailOptIn === true,
    notificationSmsOptIn: meta.notificationSmsOptIn === true,
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getBearerAppUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const driverSlug = req.nextUrl.searchParams.get("driverSlug");
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const sb = createServiceClient();
  const scoped = await resolveDriverForSlug(sb, driverSlug, user.appUserId);
  if (!scoped) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const now = new Date().toISOString();
  const driverPatch: Record<string, unknown> = { updatedAt: now };
  if (typeof body.vehicleType === "string") driverPatch.vehicleType = body.vehicleType.trim() || null;
  if (typeof body.licensePlate === "string") driverPatch.licensePlate = body.licensePlate.trim() || null;
  if (typeof body.isActive === "boolean") driverPatch.isActive = body.isActive;

  const meta = { ...((scoped.driver.metadata as Record<string, unknown> | null) ?? {}) };
  if (typeof body.vehicleModel === "string") meta.vehicleModel = body.vehicleModel.trim();
  if (typeof body.notificationEmailOptIn === "boolean") meta.notificationEmailOptIn = body.notificationEmailOptIn;
  if (typeof body.notificationSmsOptIn === "boolean") meta.notificationSmsOptIn = body.notificationSmsOptIn;
  driverPatch.metadata = meta;

  const { error: dErr } = await sb.from("Driver").update(driverPatch).eq("id", scoped.driver.id);
  if (dErr) return NextResponse.json({ message: dErr.message }, { status: 400 });

  const { data: existingProfile } = await sb
    .from("UserProfile")
    .select("id, metadata")
    .eq("userId", user.appUserId)
    .maybeSingle();

  const firstName =
    typeof body.firstName === "string" ? body.firstName.trim() : undefined;
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : undefined;
  const phone = typeof body.phone === "string" ? body.phone.trim() : undefined;
  const avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl.trim() || null : undefined;

  if (existingProfile?.id) {
    const pMeta = { ...((existingProfile.metadata as Record<string, unknown> | null) ?? {}) };
    const { error: pErr } = await sb
      .from("UserProfile")
      .update({
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        metadata: pMeta,
        updatedAt: now,
      })
      .eq("userId", user.appUserId);
    if (pErr) return NextResponse.json({ message: pErr.message }, { status: 400 });
  } else if (firstName || lastName || phone) {
    const { error: insErr } = await sb.from("UserProfile").insert({
      id: crypto.randomUUID(),
      userId: user.appUserId,
      firstName: firstName ?? "Driver",
      lastName: lastName ?? "",
      phone: phone ?? null,
      avatarUrl: avatarUrl ?? null,
      updatedAt: now,
    });
    if (insErr) return NextResponse.json({ message: insErr.message }, { status: 400 });
  }

  const { data: driver } = await sb.from("Driver").select("*").eq("id", scoped.driver.id).single();
  const { data: profile } = await sb
    .from("UserProfile")
    .select("firstName, lastName, phone, avatarUrl, metadata")
    .eq("userId", user.appUserId)
    .maybeSingle();

  return NextResponse.json({ driver, profile: profile ?? null });
}
