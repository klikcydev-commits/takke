import {
  getAppUserIdFromBearer,
  getCustomerProfileForAccessTokenClaims,
  patchCustomerProfileMe,
  verifySupabaseJwtClaims,
} from "@marketplace/marketplace-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Server error";
}

/** Current customer profile (Prisma `User` + `UserProfile` + roles). Links Supabase → app user on first request. */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const token = auth.slice(7);
  try {
    const claims = await verifySupabaseJwtClaims(token);
    if (!claims?.sub) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const dto = await getCustomerProfileForAccessTokenClaims(
      claims.sub,
      claims.email,
    );
    return NextResponse.json(dto);
  } catch (e) {
    const msg = errMessage(e);
    const status = msg.includes("SUPABASE_URL") || msg.includes("SUPABASE_JWT_SECRET") ? 503 : 400;
    return NextResponse.json({ message: msg }, { status });
  }
}

/** Update display name, phone, onboarding flag (mobile onboarding screen). */
export async function PATCH(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  let appUserId: string;
  try {
    const id = await getAppUserIdFromBearer(auth);
    if (!id) {
      return NextResponse.json(
        { message: "Link your account first (open the app after sign-in)." },
        { status: 401 },
      );
    }
    appUserId = id;
  } catch (e) {
    return NextResponse.json({ message: errMessage(e) }, { status: 503 });
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
    const dto = await patchCustomerProfileMe(appUserId, {
      display_name: b.display_name,
      phone: b.phone,
      onboarding_completed: b.onboarding_completed,
    });
    return NextResponse.json(dto);
  } catch (e) {
    return NextResponse.json({ message: errMessage(e) }, { status: 400 });
  }
}
