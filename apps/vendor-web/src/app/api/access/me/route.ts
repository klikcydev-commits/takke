import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { resolveMarketplaceAccess } from "@/lib/access/resolveMarketplaceAccess";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const access = await resolveMarketplaceAccess(user.id);
    if (!access) {
      return NextResponse.json(
        { message: "No linked marketplace account for this authenticated user." },
        { status: 403 },
      );
    }
    return NextResponse.json({
      authUserId: user.id,
      email: user.email ?? null,
      ...access,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to resolve access";
    return NextResponse.json({ message }, { status: 500 });
  }
}
