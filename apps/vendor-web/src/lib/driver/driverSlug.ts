/**
 * URL-safe tenant segment derived from `Driver.id` (UUID) — no extra DB column.
 * Slug is 32 lowercase hex chars (UUID without dashes).
 */

export function encodeDriverSlug(driverId: string): string {
  return driverId.replace(/-/g, "").toLowerCase();
}

export function decodeDriverSlug(slug: string): string | null {
  const s = slug.trim().toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(s)) return null;
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
}
