import { NextResponse } from "next/server";
import { syncSeedSupabaseAuthUsers } from "@marketplace/marketplace-server";
import { getSupabaseEnvAlignment } from "@/lib/supabaseEnvAlignment";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Dev-only: creates/links Supabase Auth users for seeded Prisma rows and sets demo password.
 * Requires SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) + DATABASE_URL in env.
 */
function allowSync(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.VENDOR_ALLOW_SYNC_SEED_AUTH === "1"
  );
}

export async function GET() {
  return run();
}

export async function POST() {
  return run();
}

async function run() {
  if (!allowSync()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const env = getSupabaseEnvAlignment();
  if (!env.aligned) {
    return NextResponse.json(
      {
        ok: false,
        message: "Fix Supabase env alignment before sync (see issues).",
        env,
      },
      { status: 400 },
    );
  }

  try {
    const result = await syncSeedSupabaseAuthUsers({ resetPassword: true });
    return NextResponse.json({
      ok: true,
      ...result,
      hint:
        result.linked.length > 0
          ? "Try vendor sign-in again with vendor@example.com / ChangeMe123! (or your SEED_DEMO_PASSWORD)."
          : result.skipped.length > 0
            ? "Some emails were skipped — run pnpm db:seed against the same DATABASE_URL as this app."
            : undefined,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json(
      {
        ok: false,
        message: msg,
        hint:
          "Ensure apps/vendor-web/.env.local has DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY (same Supabase project as the browser).",
      },
      { status: 500 },
    );
  }
}
