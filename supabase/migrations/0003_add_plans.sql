-- Migration 0003: subscription plans + daily usage tracking
-- Run this in your Supabase SQL editor AFTER 0002_add_auth.sql.
-- Also add to .env:  RAZORPAY_KEY_ID=...  RAZORPAY_KEY_SECRET=...

-- 1. Plan fields on user_profiles
alter table user_profiles
  add column if not exists plan_type          text      not null default 'free'
    check (plan_type in ('free', 'paid')),
  add column if not exists plan_expires_at    timestamptz,
  add column if not exists razorpay_order_id  text,
  add column if not exists daily_cost_usd     decimal(12, 8) not null default 0,
  add column if not exists daily_reset_date   date      not null default current_date;

-- 2. Ensure storage bucket for reference images exists
insert into storage.buckets (id, name, public)
values ('project-images', 'project-images', true)
on conflict (id) do nothing;

-- 3. Storage policy: allow public reads (needed to serve uploaded images in HTML)
drop policy if exists "Public read access for project-images" on storage.objects;
create policy "Public read access for project-images"
  on storage.objects for select
  using (bucket_id = 'project-images');
