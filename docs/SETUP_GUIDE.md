# Platform Setup Guide

## Requirements
- Node.js >= 18
- pnpm >= 8
- Docker (for local postgres/redis if not using hosted direct)
- Expo CLI for mobile simulation
- Supabase Project

## Bootstrapping Environment
1. Initialize dependencies using pnpm at workspace root.
   `pnpm install`
2. Sync `.env` file references from `.env.example` mapping Supabase API URLs, Anon Keys, and Postgres Direct DB connection string.

## Database Preparation
Use Prisma to seed structure to your active Supabase postgres cluster.
1. `npx prisma db push` (or `migrate dev`)
2. `npx prisma db seed` -> Generates structured realistic roles and mock objects across the ecosystem.

## Running Applications
- **Customer Mobile**: `pnpm --filter mobile start`
- **Vendor + commerce API (Next `/api`)**: `pnpm --filter vendor-web dev`
- **Admin dashboard**: `pnpm --filter admin-web dev`
- **Both**: `pnpm dev` from repo root
