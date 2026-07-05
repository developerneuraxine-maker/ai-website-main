-- Track when reminder emails were last sent (avoids duplicate emails)
alter table user_profiles
  add column if not exists renewal_reminder_sent_at timestamptz,
  add column if not exists free_limit_reminder_sent_at timestamptz;

-- Log every email sent by the system
create table if not exists email_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  type text not null, -- 'pro_expiring' | 'free_limit_reached'
  subject text not null,
  status text not null default 'sent', -- 'sent' | 'failed'
  error text,
  sent_at timestamptz not null default now()
);

alter table email_logs enable row level security;
-- Only service role (admin) can read/write email_logs
