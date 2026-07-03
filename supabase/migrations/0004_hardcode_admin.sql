-- Migration 0004: Hardcode admin by email instead of "first user" rule.
-- Run this in your Supabase SQL editor.

-- 1. Replace the trigger function: only socialsprouts1@gmail.com gets is_admin = true
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into user_profiles(id, email, is_admin)
  values (
    new.id,
    new.email,
    new.email = 'socialsprouts1@gmail.com'
  )
  on conflict (id) do update set
    email    = excluded.email,
    is_admin = excluded.is_admin;
  return new;
end;
$$;

-- Trigger already exists from 0002; replace it to pick up new function body
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 2. Fix any already-created user_profiles rows
update user_profiles
set is_admin = (
  select u.email = 'socialsprouts1@gmail.com'
  from auth.users u
  where u.id = user_profiles.id
);
