import { NextResponse } from "next/server";
import { getSupabaseEnvAlignment } from "@/lib/supabaseEnvAlignment";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (
    process.env.NODE_ENV !== "development" &&
    process.env.VENDOR_ALLOW_SYNC_SEED_AUTH !== "1"
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const alignment = getSupabaseEnvAlignment();
  return NextResponse.json(alignment);
}
