# Setup Guide (Supabase-First)

## 1) Install

```bash
pnpm install
```

## 2) Configure env

```bash
cp .env.example .env
```

Required values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 3) Apply SQL migrations

```bash
pnpm db:migrate
```

## 4) Run apps

```bash
pnpm dev:vendor
pnpm dev:admin
pnpm dev:mobile
```

## 5) Optional seeded auth linking

```bash
pnpm db:link-supabase-auth
```

This links existing `public."User"` rows by email to Supabase Auth users.
