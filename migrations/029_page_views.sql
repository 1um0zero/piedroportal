-- 029_page_views.sql
-- First-party navigation analytics. One row per page view (logged-in or anon).
-- Written only by the service role (server-side /api/track). RLS on, no policies.
--
-- Privacy: stores the PATHNAME only (no query string), the locale, the referrer
-- host, and — when authenticated — the user id. No patient data, no cookies
-- (re-uses the existing auth session). user_id is set NULL if the user is later
-- deleted, so counts survive erasure while the link is dropped.

create table if not exists public.page_views (
  id         bigint generated always as identity primary key,
  user_id    uuid references auth.users(id) on delete set null,
  path       text not null,
  referrer   text,
  locale     text,
  created_at timestamptz not null default now()
);
alter table public.page_views enable row level security;

create index if not exists page_views_created_idx on public.page_views (created_at desc);
create index if not exists page_views_path_idx    on public.page_views (path);
create index if not exists page_views_user_idx    on public.page_views (user_id, created_at desc);

-- Retention: 180 days. Schedule or call manually.
create or replace function public.purge_old_page_views() returns void
language sql as $$
  delete from public.page_views where created_at < now() - interval '180 days';
$$;
