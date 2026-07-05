-- Announcements table for admin broadcast banners shown to all users
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  type text not null default 'info' check (type in ('info', 'warning', 'success')),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null
);

-- Service role bypasses RLS, so all admin operations work fine.
-- Enable RLS so anon/user roles can only read active announcements.
alter table announcements enable row level security;

create policy "anyone can read active announcements"
  on announcements for select
  using (expires_at is null or expires_at > now());
