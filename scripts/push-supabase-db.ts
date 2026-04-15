/**
 * Applies pending SQL migrations in `supabase/migrations/` to the remote database
 * using the Supabase CLI (`supabase db push`).
 *
 * Requires `DIRECT_URL` or `DATABASE_URL` in `.env.local` (use the direct Postgres
 * connection on port 5432, not the pooler port 6543, for reliable DDL).
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const direct = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
if (!direct) {
  console.error(
    "Missing DIRECT_URL (preferred) or DATABASE_URL in .env.local — add your Postgres connection string.",
  );
  process.exit(1);
}

if (direct.includes(":6543/") || direct.includes("pgbouncer=true")) {
  console.warn(
    "Warning: pooler URL detected. Prefer DIRECT_URL to port 5432 without pgbouncer for migrations.",
  );
}

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["--yes", "supabase@latest", "db", "push", "--db-url", direct, "--yes"],
  { stdio: "inherit", cwd: process.cwd(), shell: true, env: process.env },
);

process.exit(result.status ?? 1);
