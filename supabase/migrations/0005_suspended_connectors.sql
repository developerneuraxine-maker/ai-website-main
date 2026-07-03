-- Migration 0005: Add suspended_at/reason to user_profiles + create connectors table.
-- Run this in your Supabase SQL editor if not already done.

-- 1. Add suspension columns to user_profiles (safe to run multiple times)
alter table user_profiles add column if not exists suspended_at timestamptz;
alter table user_profiles add column if not exists suspended_reason text;

-- 2. Create connectors table for OAuth + API-key integrations
create table if not exists connectors (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  provider       text not null,
  access_token   text,
  refresh_token  text,
  token_expires_at timestamptz,
  metadata       jsonb not null default '{}',
  connected_at   timestamptz not null default now(),
  unique(user_id, provider)
);

-- 3. Enable RLS (service-role bypasses for server-side ops)
alter table connectors enable row level security;
create policy "users see own connectors" on connectors
  using (auth.uid() = user_id);
