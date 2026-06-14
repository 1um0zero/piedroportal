-- 030_seen_welcome.sql
-- One-time first-login welcome. Every existing row defaults to false, so all
-- migrated users see the welcome once on their first visit to the new portal;
-- it is dismissed permanently per user.
alter table public.profiles
  add column if not exists seen_welcome boolean not null default false;
