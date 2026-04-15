import { config } from "dotenv";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

async function main() {
  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ?? process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? process.env.SUPABASE_SECRET_KEY?.trim() ?? "";
  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

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

  const linked: string[] = [];
  const skipped: string[] = [];
  const errors: Array<{ email: string; message: string }> = [];

  for (const email of emails) {
    try {
      const normalized = email.trim().toLowerCase();
      const { data: existing, error: lookupErr } = await sb.auth.admin.listUsers();
      if (lookupErr) throw new Error(lookupErr.message);
      let authUser = existing.users.find((u) => (u.email ?? "").toLowerCase() === normalized);

      if (!authUser) {
        const { data: created, error: createErr } = await sb.auth.admin.createUser({
          email: normalized,
          password: demoPassword,
          email_confirm: true,
        });
        if (createErr) throw new Error(createErr.message);
        authUser = created.user;
      } else if (resetPw) {
        const { error: updateErr } = await sb.auth.admin.updateUserById(authUser.id, {
          password: demoPassword,
          email_confirm: true,
        });
        if (updateErr) throw new Error(updateErr.message);
      }
      if (!authUser?.id) throw new Error("Failed to resolve auth user ID");

      const { data: userRow, error: userErr } = await sb
        .from("User")
        .select("id,email")
        .eq("email", normalized)
        .maybeSingle();
      if (userErr) throw new Error(userErr.message);
      if (!userRow?.id) {
        skipped.push(normalized);
        continue;
      }

      const { error: linkErr } = await sb
        .from("User")
        .update({ auth_user_id: authUser.id, updatedAt: new Date().toISOString() })
        .eq("id", userRow.id);
      if (linkErr) throw new Error(linkErr.message);
      linked.push(normalized);
    } catch (e) {
      errors.push({
        email,
        message: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  for (const email of skipped) {
    console.warn(`Skip ${email}: no public."User" row — run seed first.`);
  }
  for (const { email, message } of errors) {
    console.warn(`Error ${email}: ${message}`);
  }
  for (const email of linked) {
    console.log(`OK ${email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
