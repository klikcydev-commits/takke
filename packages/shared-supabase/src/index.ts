export { getPublicSupabaseEnv, type PublicSupabaseEnv } from "./env.js";
export { AppRole, type AppRoleName } from "./roles.js";
export { createSupabaseAnonClient } from "./client.js";
export {
  canAccessAdminDashboard,
  canAccessVendorDashboard,
  canAccessDriverDashboard,
  isStoreOwnerRole,
  isDeliveryDriverRole,
} from "./access.js";
export type { AdminMeResponse } from "./types.js";
export {
  SUPABASE_AUTH_RATE_LIMIT_MESSAGE,
  formatSupabaseAuthError,
  getSupabaseAuthErrorInfo,
  logSupabaseSignup,
  type SignupLogPhase,
  type SupabaseAuthErrorInfo,
} from "./authErrors.js";
