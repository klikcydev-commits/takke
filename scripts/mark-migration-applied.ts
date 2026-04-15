/**
 * Marks a migration version as applied in the remote DB history (after you applied
 * the same SQL manually via `pnpm db:sql`).
 *
 * Usage: pnpm exec tsx scripts/mark-migration-applied.ts 20260211120000
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const version = process.argv[2]?.trim();
if (!version?.match(/^\d+$/)) {
  console.error("Usage: pnpm exec tsx scripts/mark-migration-applied.ts <version>");
  process.exit(1);
}

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const direct = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
if (!direct) {
  console.error("Missing DIRECT_URL or DATABASE_URL in .env.local");
  process.exit(1);
}

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  [
    "--yes",
    "supabase@latest",
    "migration",
    "repair",
    "--status",
    "applied",
    version,
    "--db-url",
    direct,
  ],
  { stdio: "inherit", cwd: process.cwd(), shell: true, env: process.env },
);

process.exit(result.status ?? 1);
