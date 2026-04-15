import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decodeDriverSlug, encodeDriverSlug } from "@/lib/driver/driverSlug";
import { resolveMarketplaceAccess } from "@/lib/access/resolveMarketplaceAccess";

export type DriverPageContext = {
  authUserId: string;
  appUserId: string;
  driverId: string;
  driverSlug: string;
  isApprovedDriver: boolean;
  access: Awaited<ReturnType<typeof resolveMarketplaceAccess>>;
};

/** Validates tenant slug + session; redirects to canonical driver URL when needed. */
export async function requireDriverPage(driverSlugParam: string): Promise<DriverPageContext> {
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

  const access = await resolveMarketplaceAccess(user.id);
  if (!access) redirect("/register/driver");

  const decodedId = decodeDriverSlug(driverSlugParam);
  if (!decodedId) redirect("/driver/dashboard");

  const { data: driver } = await sb
    .from("Driver")
    .select("id, userId")
    .eq("id", decodedId)
    .maybeSingle();

  if (!driver || driver.userId !== appUser.id) {
    const { data: own } = await sb.from("Driver").select("id").eq("userId", appUser.id).maybeSingle();
    if (own?.id) {
      redirect(`/driver/d/${encodeDriverSlug(own.id)}/dashboard`);
    }
    redirect("/register/driver");
  }

  const isApprovedDriver = access.roles.includes("DELIVERY_DRIVER");

  return {
    authUserId: user.id,
    appUserId: appUser.id,
    driverId: driver.id,
    driverSlug: encodeDriverSlug(driver.id),
    isApprovedDriver,
    access,
  };
}
