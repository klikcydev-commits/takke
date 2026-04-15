/**
 * Link Supabase Auth users to app `User` rows (CUSTOMER role by default).
 * Implemented with Supabase service-role client — not Prisma.
 */
export { ensureLinkedAppUser } from "./userProfileSupabaseData.js";
