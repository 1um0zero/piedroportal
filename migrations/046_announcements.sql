-- ─────────────────────────────────────────────────────────────────────────────
-- 046 — Announcements (in-portal messages / pop-ups)
--
-- The admin composes a rich-HTML message (reusing the e-mail composer's editor +
-- AI translation), picks WHERE it shows (after login / public homepage / when
-- starting an order), HOW it shows (popup / chip / banner) and the WINDOW of
-- dates it is live. The display components read the active set server-side.
--
-- `translations` mirrors email_campaigns: { "<locale>": { "title": "...",
-- "body_html": "..." } }. The source-locale copy lives in title/body_html; the
-- viewer's locale wins, falling back to the source.
--
-- Access: service-role only (server components / admin actions read & write).
-- RLS enabled with no policies → anon/authenticated clients are locked out, just
-- like email_campaigns (migration 020).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists announcements (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,                       -- shown as heading (source locale) + admin label
  source_locale text not null default 'en',
  body_html     text not null,                       -- rich HTML (source locale)
  translations  jsonb,                               -- { "<loc>": { "title": ?, "body_html": "..." } }
  display_type  text not null check (display_type in ('popup', 'chip', 'banner')),
  placement     text[] not null default '{}',        -- subset of after_login | homepage | order_start
  starts_at     timestamptz,                         -- null = no lower bound
  ends_at       timestamptz,                         -- null = no upper bound
  active        boolean not null default true,       -- master on/off, independent of the date window
  dismissible   boolean not null default true,       -- allow the viewer to close it for the session
  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Fast "what is live right now for this placement" lookup.
create index if not exists idx_announcements_live
  on announcements (active, starts_at, ends_at);
create index if not exists idx_announcements_placement
  on announcements using gin (placement);

alter table announcements enable row level security;
-- No policies on purpose: only the service role (bypasses RLS) may touch these.
