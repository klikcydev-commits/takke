-- Phase 1: authenticated users can read their own marketplace profile row.
-- Service role (server-side) bypasses RLS for admin /me route and tooling.
-- Apply via Supabase SQL editor or `supabase db push` when using Supabase CLI.

alter table public."User" enable row level security;

drop policy if exists "user_select_own_profile" on public."User";

create policy "user_select_own_profile"
  on public."User"
  for select
  to authenticated
  using (auth.uid() = auth_user_id);
