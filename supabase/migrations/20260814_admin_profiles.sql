-- Run this in the Supabase SQL editor before enabling Supabase-backed staff access.
-- It intentionally does not delete MongoDB data; the rest of the data migration
-- must be verified collection by collection, especially wallets and payments.

create table if not exists public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Admin',
  email text not null unique,
  role text not null default 'ADMIN' check (role in (
    'OWNER', 'OFFICIAL_OWNER', 'SUPER_ADMIN', 'MANAGER', 'ADMIN',
    'BD_LEADER', 'BD', 'AGENCY', 'HOST', 'COIN_SELLER'
  )),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_profiles enable row level security;

drop policy if exists "admins can read their own profile" on public.admin_profiles;
create policy "admins can read their own profile"
  on public.admin_profiles for select to authenticated
  using (id = auth.uid() and is_active = true);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists admin_profiles_updated_at on public.admin_profiles;
create trigger admin_profiles_updated_at
  before update on public.admin_profiles
  for each row execute function public.set_updated_at();

-- After creating Supabase Auth users, insert their matching profiles here. Never
-- insert passwords or service-role keys into this migration file.
