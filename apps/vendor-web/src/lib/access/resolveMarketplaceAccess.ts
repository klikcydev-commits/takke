import { createServiceClient } from "@/lib/supabase/service";

type MarketplaceRole =
  | "CUSTOMER"
  | "STORE_OWNER"
  | "DELIVERY_DRIVER"
  | "ADMIN"
  | "SUPER_ADMIN";

export type MarketplaceAccess = {
  appUserId: string;
  roles: MarketplaceRole[];
  requestedRole: MarketplaceRole | null;
  onboardingStatus: string;
  storeApplicationStatus: string | null;
  driverApplicationStatus: string | null;
};

function uniqueRoles(values: unknown[]): MarketplaceRole[] {
  const allowed = new Set<MarketplaceRole>([
    "CUSTOMER",
    "STORE_OWNER",
    "DELIVERY_DRIVER",
    "ADMIN",
    "SUPER_ADMIN",
  ]);
  const out = new Set<MarketplaceRole>();
  for (const value of values) {
    if (typeof value === "string" && allowed.has(value as MarketplaceRole)) {
      out.add(value as MarketplaceRole);
    }
  }
  return [...out];
}

function isSchemaMismatchError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("does not exist") ||
    normalized.includes("could not find the") ||
    normalized.includes("schema cache")
  );
}

export async function resolveMarketplaceAccess(
  authUserId: string,
): Promise<MarketplaceAccess | null> {
  const service = createServiceClient();

  const { data: user, error: userErr } = await service
    .from("User")
    .select("id, requestedRole, onboardingStatus")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (userErr) throw new Error(`Failed to resolve user: ${userErr.message}`);
  if (!user?.id) return null;

  const { data: links, error: linksErr } = await service
    .from("UserRoleAssignment")
    .select("roleId")
    .eq("userId", user.id);
  if (linksErr) throw new Error(`Failed to resolve role links: ${linksErr.message}`);

  const roleIds = (links ?? []).map((r) => r.roleId).filter(Boolean);
  let roles: MarketplaceRole[] = [];
  if (roleIds.length > 0) {
    const { data: roleRows, error: rolesErr } = await service
      .from("Role")
      .select("name")
      .in("id", roleIds);
    if (rolesErr) throw new Error(`Failed to resolve roles: ${rolesErr.message}`);
    roles = uniqueRoles((roleRows ?? []).map((r) => r.name));
  }

  let storeApplicationStatus: string | null = null;
  {
    const byUser = await service
      .from("StoreApplication")
      .select("status, createdAt")
      .eq("userId", user.id)
      .order("createdAt", { ascending: false })
      .limit(1);
    if (!byUser.error) {
      storeApplicationStatus = byUser.data?.[0]?.status ?? null;
    } else if (isSchemaMismatchError(byUser.error.message)) {
      // Fallback for schemas where StoreApplication links via storeId instead of userId.
      const storeLookup = await service
        .from("Store")
        .select("id")
        .eq("ownerId", user.id)
        .order("createdAt", { ascending: false })
        .limit(1);
      if (storeLookup.error) {
        throw new Error(`Failed to resolve store owner store: ${storeLookup.error.message}`);
      }
      const storeId = storeLookup.data?.[0]?.id;
      if (storeId) {
        const byStore = await service
          .from("StoreApplication")
          .select("status, createdAt")
          .eq("storeId", storeId)
          .order("createdAt", { ascending: false })
          .limit(1);
        if (byStore.error) {
          throw new Error(`Failed to resolve store application: ${byStore.error.message}`);
        }
        storeApplicationStatus = byStore.data?.[0]?.status ?? null;
      }
    } else {
      throw new Error(`Failed to resolve store application: ${byUser.error.message}`);
    }
  }

  const { data: driverAppRows, error: driverAppErr } = await service
    .from("DriverApplication")
    .select("status, createdAt")
    .eq("userId", user.id)
    .order("createdAt", { ascending: false })
    .limit(1);
  if (driverAppErr) {
    if (!isSchemaMismatchError(driverAppErr.message)) {
      throw new Error(`Failed to resolve driver application: ${driverAppErr.message}`);
    }
  }

  return {
    appUserId: user.id,
    roles,
    requestedRole: (user.requestedRole as MarketplaceRole | null) ?? null,
    onboardingStatus: user.onboardingStatus ?? "NONE",
    storeApplicationStatus,
    driverApplicationStatus: driverAppRows?.[0]?.status ?? null,
  };
}
