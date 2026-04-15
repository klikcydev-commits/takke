/**
 * Customer profile DTO + mutations — Supabase service-role implementation.
 */
export type { CustomerProfileMeDto } from "./userProfileSupabaseData.js";
export {
  getCustomerProfileForAccessTokenClaims,
  patchCustomerProfileMe,
} from "./userProfileSupabaseData.js";
