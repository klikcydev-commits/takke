/**
 * Runs `supabase db query -f <temp.sql>` per statement so multi-statement DDL applies.
 *
 * Usage: pnpm exec tsx scripts/apply-sql-file.ts <path-to.sql>
 */
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import { spawnSync } from "node:child_process";

const file = process.argv[2];
if (!file?.trim()) {
  console.error("Usage: pnpm exec tsx scripts/apply-sql-file.ts <path-to.sql>");
  process.exit(1);
}

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const direct = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
if (!direct) {
  console.error("Missing DIRECT_URL or DATABASE_URL in .env.local");
  process.exit(1);
}

const sql = readFileSync(resolve(process.cwd(), file), "utf8");
const statements = sql
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

for (let i = 0; i < statements.length; i++) {
  const stmt = `${statements[i]};`;
  const tmp = join(tmpdir(), `apply-sql-${randomBytes(8).toString("hex")}.sql`);
  writeFileSync(tmp, stmt, "utf8");
  console.log(`-- Executing statement ${i + 1}/${statements.length}`);
  try {
    const result = spawnSync(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["--yes", "supabase@latest", "db", "query", "-f", tmp, "--db-url", direct],
      { stdio: "inherit", cwd: process.cwd(), shell: true, env: process.env },
    );
    if (result.error) {
      console.error(result.error);
      process.exit(1);
    }
    if (result.status !== 0) {
      console.error(`supabase db query exited with status ${result.status}`);
      process.exit(result.status ?? 1);
    }
  } finally {
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}
