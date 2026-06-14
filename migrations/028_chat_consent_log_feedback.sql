-- 028_chat_consent_log_feedback.sql
-- Assistant (portal chat) governance: explicit consent before first use,
-- auditable in/out message log, and a feedback review queue.
--
-- All three tables are written/read only by the service role (server-side).
-- RLS is enabled with NO policies so the anon/auth clients can never touch them.

-- ── Consent ──────────────────────────────────────────────────────────────────
-- One row per (user, consent text version) the moment the user accepts.
create table if not exists public.chat_consents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  text_version integer not null,
  locale       text,
  accepted_at  timestamptz not null default now(),
  unique (user_id, text_version)
);
alter table public.chat_consents enable row level security;

-- ── Message log ──────────────────────────────────────────────────────────────
-- direction: 'in' = user prompt, 'out' = assistant reply.
-- role_seen = the role the assistant treated the user as (audit of the bug we hit).
create table if not exists public.chat_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role_seen  text,
  direction  text not null check (direction in ('in', 'out')),
  content    text not null,
  created_at timestamptz not null default now()
);
alter table public.chat_logs enable row level security;
create index if not exists chat_logs_user_idx    on public.chat_logs (user_id, created_at desc);
create index if not exists chat_logs_created_idx  on public.chat_logs (created_at);

-- ── Feedback review queue ────────────────────────────────────────────────────
-- Raised when a user marks an answer as "should be improved".
create table if not exists public.chat_feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  role_seen   text,
  question    text,
  answer      text,
  status      text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  note        text,
  created_at  timestamptz not null default now()
);
alter table public.chat_feedback enable row level security;
create index if not exists chat_feedback_status_idx on public.chat_feedback (status, created_at desc);

-- ── Retention (90 days) ──────────────────────────────────────────────────────
-- Call manually or schedule via pg_cron / the campaign cron. Consent and
-- resolved feedback are kept; only the raw message log is purged.
create or replace function public.purge_old_chat_logs() returns void
language sql as $$
  delete from public.chat_logs where created_at < now() - interval '90 days';
$$;
