import { config } from 'dotenv';
import { resolve } from 'node:path';
import { defineConfig } from 'prisma/config';

// Load .env then let .env.local override – same as before
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local'), override: true });

/**
 * Prisma v7 — datasource.url must be a resolved string (not env()).
 *
 * DIRECT_URL  → Supavisor Session pooler :5432 — used by the Prisma CLI for
 *               migrate / db push (supports DDL; no pgBouncer limitation).
 * DATABASE_URL → Transaction pooler :6543 + ?pgbouncer=true — runtime only,
 *               used by PrismaClient in Next `/api` routes and server code.
 */
export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    path: './prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
});
