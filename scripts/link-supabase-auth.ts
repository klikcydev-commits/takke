/**
 * Links public.User rows to Supabase Auth users (sets auth_user_id).
 * Run after: pnpm db:seed (or migrate + seed).
 *
 * Requires: DATABASE_URL, SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY).
 * Optional: LINK_SUPABASE_EMAILS=comma-separated emails (default: admin@marketplace.com,vendor@example.com)
 * Optional: SEED_DEMO_PASSWORD (default: ChangeMe123!) — used for new Auth users and when resetting.
 * Optional: LINK_RESET_AUTH_PASSWORD=1 — also set Auth password to SEED_DEMO_PASSWORD (wrong password fix).
 *
 * Windows PowerShell (env vars are not `KEY=value cmd`):
 *   $env:LINK_RESET_AUTH_PASSWORD="1"; pnpm exec tsx scripts/link-supabase-auth.ts
 *
 * Or from a running vendor dev server, open: GET /api/dev/sync-seed-auth (development only).
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import {
  disconnectPrisma,
  syncSeedSupabaseAuthUsers,
} from "../packages/marketplace-server/src/index.ts";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

async function main() {
  const emails = (
    process.env.LINK_SUPABASE_EMAILS ??
    "admin@marketplace.com,vendor@example.com"
  )
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  const resetPw =
    process.env.LINK_RESET_AUTH_PASSWORD === "1" ||
    process.env.LINK_RESET_AUTH_PASSWORD === "true";

  const demoPassword = process.env.SEED_DEMO_PASSWORD ?? "ChangeMe123!";

  console.log(
    `Linking Supabase Auth for: ${emails.join(", ")} (password sync: ${resetPw ? `yes → ${demoPassword}` : "no — set LINK_RESET_AUTH_PASSWORD=1 if login says Invalid credentials"})`,
  );

  const result = await syncSeedSupabaseAuthUsers({
    emails,
    resetPassword: resetPw,
  });

  for (const email of result.skipped) {
    console.warn(`Skip ${email}: no public."User" row — run seed first.`);
  }
  for (const { email, message } of result.errors) {
    console.warn(`Error ${email}: ${message}`);
  }
  for (const email of result.linked) {
    console.log(`OK ${email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectPrisma();
  });
