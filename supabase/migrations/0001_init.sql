-- Lumen schema: single implicit workspace, no auth, no RLS.
-- Run this once in the Supabase SQL editor (or via `supabase db push`).

create extension if not exists pgcrypto;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  prompt text not null,
  category text not null,
  status text not null default 'live' check (status in ('live', 'draft', 'building', 'error')),
  url text,
  thumbnail text not null,
  generated_html text not null,
  visits integer not null default 0,
  score integer,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  who text not null check (who in ('you', 'ai')),
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  label text not null,
  author text not null default 'AI',
  html_snapshot text not null,
  created_at timestamptz not null default now()
);

create table if not exists deployments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  env text not null default 'production' check (env in ('production', 'preview')),
  status text not null default 'success' check (status in ('success', 'building', 'failed')),
  target text not null default 'lumen',
  commit_message text not null default 'Generated via prompt',
  created_at timestamptz not null default now()
);

create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  key_value text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create table if not exists workspace_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  role text not null default 'Viewer' check (role in ('Owner', 'Editor', 'Viewer')),
  avatar_gradient text not null default 'from-amber-400 to-rose-500',
  created_at timestamptz not null default now()
);

create table if not exists settings (
  id integer primary key default 1 check (id = 1),
  dark_mode boolean not null default true,
  reduce_motion boolean not null default false,
  compact_density boolean not null default false,
  autosave boolean not null default true,
  show_grid boolean not null default false,
  format_on_save boolean not null default true,
  email_on_deploy_fail boolean not null default true,
  weekly_digest boolean not null default false
);
insert into settings (id) values (1) on conflict (id) do nothing;

create table if not exists profile (
  id integer primary key default 1 check (id = 1),
  full_name text not null default '',
  email text not null default '',
  username text not null default '',
  role text not null default '',
  bio text not null default '',
  avatar_url text
);
insert into profile (id) values (1) on conflict (id) do nothing;

-- Public bucket for reference images attached on the "New website" prompt screen.
insert into storage.buckets (id, name, public)
values ('project-images', 'project-images', true)
on conflict (id) do nothing;

drop policy if exists "Public read access for project-images" on storage.objects;
create policy "Public read access for project-images"
  on storage.objects for select
  using (bucket_id = 'project-images');
