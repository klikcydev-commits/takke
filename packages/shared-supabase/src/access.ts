import { AppRole } from "./roles.js";

/** Roles allowed to use the admin Next.js app (dashboard). */
export function canAccessAdminDashboard(roles: string[]): boolean {
  return roles.some((r) => r === AppRole.ADMIN || r === AppRole.SUPER_ADMIN);
}

/** Store owner dashboard (vendor app) — approved store only (caller must verify store + status). */
export function isStoreOwnerRole(roles: string[]): boolean {
  return roles.includes(AppRole.STORE_OWNER);
}

export function isDeliveryDriverRole(roles: string[]): boolean {
  return roles.includes(AppRole.DELIVERY_DRIVER);
}

/**
 * Whether the user may access the vendor dashboard UX.
 * Approved store + owner role — approval flags come from Store / onboarding (caller supplies).
 */
export function canAccessVendorDashboard(input: {
  roles: string[];
  storeStatus?: string | null;
  onboardingStatus?: string | null;
}): boolean {
  if (!isStoreOwnerRole(input.roles)) return false;
  if (input.storeStatus === "APPROVED") return true;
  if (input.onboardingStatus === "APPROVED") return true;
  return false;
}

/**
 * Driver app dashboard — role + application approval (simplified; extend when driver schema is wired).
 */
export function canAccessDriverDashboard(input: {
  roles: string[];
  driverApplicationStatus?: string | null;
}): boolean {
  if (!isDeliveryDriverRole(input.roles)) return false;
  const s = input.driverApplicationStatus;
  if (s === undefined || s === null) return false;
  return s === "APPROVED";
}
