-- Migration 0002: Add multi-user auth
-- Run this in your Supabase SQL editor AFTER 0001_init.sql.
-- Then restart your dev server.

-- 1. user_profiles table (one row per Supabase auth user)
create table if not exists user_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- 2. Trigger: first user to sign up becomes admin, also cache email
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into user_profiles(id, email, is_admin)
  values (
    new.id,
    new.email,
    (select count(*) = 0 from user_profiles)  -- first user → admin
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 3. Add user_id to data tables (nullable to preserve any existing rows)
alter table projects         add column if not exists user_id uuid references auth.users(id);
alter table api_keys         add column if not exists user_id uuid references auth.users(id);
alter table workspace_members add column if not exists user_id uuid references auth.users(id);
alter table deployments      add column if not exists user_id uuid references auth.users(id);
alter table project_versions add column if not exists user_id uuid references auth.users(id);

-- 4. Convert settings + profile from id=1 singletons to per-user rows
alter table settings drop constraint if exists settings_id_check;
alter table settings add column if not exists user_id uuid unique references auth.users(id);
alter table profile  drop constraint if exists profile_id_check;
alter table profile  add column if not exists user_id uuid unique references auth.users(id);

-- 5. Enable RLS (service-role key still bypasses for all server-side ops)
alter table user_profiles      enable row level security;
alter table projects           enable row level security;
alter table project_messages   enable row level security;
alter table project_versions   enable row level security;
alter table deployments        enable row level security;
alter table api_keys           enable row level security;
alter table workspace_members  enable row level security;
alter table settings           enable row level security;
alter table profile            enable row level security;

-- RLS policies: users see own data; null user_id = legacy pre-auth data (visible to owner only)
create policy if not exists "own_user_profiles"    on user_profiles    using (auth.uid() = id);
create policy if not exists "own_projects"          on projects          using (auth.uid() = user_id or user_id is null);
create policy if not exists "own_project_messages" on project_messages  using (project_id in (select id from projects where user_id = auth.uid() or user_id is null));
create policy if not exists "own_project_versions" on project_versions  using (project_id in (select id from projects where user_id = auth.uid() or user_id is null));
create policy if not exists "own_deployments"      on deployments       using (auth.uid() = user_id or user_id is null);
create policy if not exists "own_api_keys"         on api_keys          using (auth.uid() = user_id or user_id is null);
create policy if not exists "own_workspace"        on workspace_members using (auth.uid() = user_id or user_id is null);
create policy if not exists "own_settings"         on settings          using (auth.uid() = user_id or user_id is null);
create policy if not exists "own_profile"          on profile           using (auth.uid() = user_id or user_id is null);
