import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      message:
        "Deprecated endpoint. Use `pnpm db:link-supabase-auth` for Supabase-native auth linking.",
    },
    { status: 410 },
  );
}

export async function POST() {
  return GET();
}
