import { prisma } from "./prisma.js";
import { getServiceRoleSupabase } from "./supabaseServiceRole.js";

export type SyncSeedSupabaseAuthResult = {
  linked: string[];
  skipped: string[];
  errors: { email: string; message: string }[];
};

/**
 * Ensures Supabase Auth has users for seeded Prisma emails, links `authUserId`,
 * confirms email, and optionally sets password to `SEED_DEMO_PASSWORD` (default ChangeMe123!).
 */
export async function syncSeedSupabaseAuthUsers(opts?: {
  emails?: string[];
  /** When true, sets Auth password to demo password (fixes invalid_credentials). */
  resetPassword?: boolean;
}): Promise<SyncSeedSupabaseAuthResult> {
  const supabase = getServiceRoleSupabase();
  const demoPassword = process.env.SEED_DEMO_PASSWORD ?? "ChangeMe123!";
  const defaultEmails = ["admin@marketplace.com", "vendor@example.com"];
  const emails = opts?.emails ?? defaultEmails;
  const resetPassword = opts?.resetPassword ?? false;

  const linked: string[] = [];
  const skipped: string[] = [];
  const errors: { email: string; message: string }[] = [];

  async function findAuthUserIdByEmail(email: string): Promise<string | null> {
    const normalized = email.toLowerCase();
    let page = 1;
    const perPage = 1000;
    for (;;) {
      const { data, error: listErr } = await supabase.auth.admin.listUsers({
        page,
        perPage,
      });
      if (listErr) throw listErr;
      const found = data.users.find((u) => u.email?.toLowerCase() === normalized);
      if (found?.id) return found.id;
      if (data.users.length < perPage) break;
      page += 1;
      if (page > 50) break;
    }
    return null;
  }

  async function ensureAuthUserId(email: string): Promise<string> {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password: demoPassword,
      email_confirm: true,
    });
    if (!createErr && created.user?.id) return created.user.id;
    const existing = await findAuthUserIdByEmail(email);
    if (existing) return existing;
    if (createErr) throw createErr;
    throw new Error(`Could not create or resolve auth user for ${email}`);
  }

  for (const email of emails) {
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        skipped.push(email);
        continue;
      }
      const authId = await ensureAuthUserId(email);
      await prisma.user.update({
        where: { id: user.id },
        data: { authUserId: authId },
      });
      const patch: { email_confirm: boolean; password?: string } = {
        email_confirm: true,
      };
      if (resetPassword) patch.password = demoPassword;
      const { error: updErr } = await supabase.auth.admin.updateUserById(authId, patch);
      if (updErr) {
        errors.push({ email, message: updErr.message });
      } else {
        linked.push(email);
      }
    } catch (e) {
      errors.push({
        email,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return { linked, skipped, errors };
}
