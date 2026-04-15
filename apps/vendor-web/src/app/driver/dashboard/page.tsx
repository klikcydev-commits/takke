import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { encodeDriverSlug } from "@/lib/driver/driverSlug";

export const dynamic = "force-dynamic";

/** Legacy entry: sends each driver to their tenant-scoped dashboard URL. */
export default async function LegacyDriverDashboardRedirect() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/register/driver");

  const sb = createServiceClient();
  const { data: appUser } = await sb
    .from("User")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!appUser?.id) redirect("/register/driver");

  const { data: driver } = await sb.from("Driver").select("id").eq("userId", appUser.id).maybeSingle();
  if (!driver?.id) redirect("/register/driver");

  redirect(`/driver/d/${encodeDriverSlug(driver.id)}/dashboard`);
}
