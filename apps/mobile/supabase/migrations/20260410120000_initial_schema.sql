-- Consolidated initial schema migration 

-- Function to handle updated_at timestamps 
create or replace function public.handle_updated_at() 
returns trigger 
language plpgsql 
as $$ 
begin 
  new.updated_at = timezone('utc'::text, now()); 
  return new; 
end; 
$$; 

-- Create profiles table 
create table if not exists public.profiles ( 
  id uuid references auth.users on delete cascade primary key, 
  full_name text, 
  avatar_url text, 
  phone text, 
  role text not null default 'buyer' check (role in ('buyer', 'vendor', 'courier')), 
  onboarding_completed boolean default false, 
  is_premium boolean default false, 
  premium_expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null, 
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null 
); 

-- Enable Row Level Security 
alter table public.profiles enable row level security; 

-- RLS Policies 
-- Users can read their own profile 
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile" 
on public.profiles 
for select 
using (auth.uid() = id); 

-- Users can update their own profile 
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" 
on public.profiles 
for update 
using (auth.uid() = id) 
with check (auth.uid() = id); 

-- Function to handle new user profile creation 
create or replace function public.handle_new_user() 
returns trigger 
language plpgsql 
security definer set search_path = public 
as $$ 
begin 
  insert into public.profiles (id, full_name, avatar_url) 
  values ( 
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url' 
  ); 
  return new; 
end; 
$$; 

-- Trigger to automatically create a profile for new users 
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created 
  after insert on auth.users 
  for each row execute function public.handle_new_user(); 

-- Trigger to update 'updated_at' whenever a profile is modified 
drop trigger if exists on_profile_updated on public.profiles;
create trigger on_profile_updated 
  before update on public.profiles 
  for each row execute function public.handle_updated_at(); 
