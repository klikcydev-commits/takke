/**
 * Application role names — align with Postgres enums / JWT claims after migration.
 * Keep in sync with RLS helpers and Supabase Auth custom claims.
 */
export const AppRole = {
  CUSTOMER: "CUSTOMER",
  STORE_OWNER: "STORE_OWNER",
  DELIVERY_DRIVER: "DELIVERY_DRIVER",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;

export type AppRoleName = (typeof AppRole)[keyof typeof AppRole];
