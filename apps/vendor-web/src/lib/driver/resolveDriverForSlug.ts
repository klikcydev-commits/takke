import type { SupabaseClient } from "@supabase/supabase-js";
import { decodeDriverSlug } from "./driverSlug";

export type DriverRow = {
  id: string;
  userId: string;
  vehicleType: string | null;
  licensePlate: string | null;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Ensures `driverSlug` decodes to a Driver row owned by `appUserId`.
 * Never trust the slug alone — always pair with authenticated user id.
 */
export async function resolveDriverForSlug(
  sb: SupabaseClient,
  driverSlug: string | null | undefined,
  appUserId: string,
): Promise<{ driver: DriverRow; driverSlug: string } | null> {
  const raw = driverSlug?.trim();
  if (!raw) return null;
  const driverId = decodeDriverSlug(raw);
  if (!driverId) return null;

  const { data: driver, error } = await sb
    .from("Driver")
    .select("id, userId, vehicleType, licensePlate, isActive, metadata, createdAt, updatedAt")
    .eq("id", driverId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!driver || driver.userId !== appUserId) return null;

  return {
    driver: driver as DriverRow,
    driverSlug: raw.toLowerCase(),
  };
}
