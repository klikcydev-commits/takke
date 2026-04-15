import { NextRequest, NextResponse } from "next/server";
import {
  verifySupabaseJwtClaims,
  ensureLinkedAppUser,
} from "@marketplace/marketplace-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Server error";
}

/** Links Supabase Auth user to Prisma `User` (CUSTOMER role) by email / authUserId. */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const token = auth.slice(7);
  let payload: { sub?: string; email?: string } | null;
  try {
    payload = await verifySupabaseJwtClaims(token);
  } catch (e) {
    return NextResponse.json({ message: errMessage(e) }, { status: 503 });
  }
  if (!payload?.sub) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const email = payload.email?.trim();
  if (!email) {
    return NextResponse.json(
      { message: "Access token must include an email claim." },
      { status: 400 },
    );
  }
  try {
    const user = await ensureLinkedAppUser({ authUserId: payload.sub, email });
    return NextResponse.json({ id: user.id, email: user.email });
  } catch (e) {
    return NextResponse.json({ message: errMessage(e) }, { status: 500 });
  }
}
