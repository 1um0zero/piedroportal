-- ─────────────────────────────────────────────────────────────────────────────
-- 020 — Email campaigns (admin broadcast tool)
--
-- A campaign targets one user, one company's users, or all users that belong
-- to a company. Recipients are SNAPSHOTTED at schedule time into
-- email_campaign_recipients; a throttled processor (cron + self-chain) drains
-- them in small paced batches so bulk sends never look like spam bursts.
--
-- Access: service-role only (server actions / cron route). RLS enabled with no
-- policies → anon/authenticated clients are fully locked out.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists email_campaigns (
  id            uuid primary key default gen_random_uuid(),
  subject       text not null,
  body          text not null,                  -- plain text; rendered to HTML by the sender
  audience      text not null check (audience in ('user', 'company', 'all_with_company')),
  target_user_id    uuid references profiles(id) on delete set null,
  target_company_id uuid references companies(id) on delete set null,
  scheduled_at  timestamptz not null default now(),   -- start of the send window
  status        text not null default 'scheduled'
                check (status in ('scheduled', 'sending', 'sent', 'cancelled')),
  total_recipients int not null default 0,
  sent_count    int not null default 0,
  failed_count  int not null default 0,
  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  started_at    timestamptz,
  finished_at   timestamptz
);

create table if not exists email_campaign_recipients (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references email_campaigns(id) on delete cascade,
  user_id      uuid references profiles(id) on delete set null,
  email        text not null,
  full_name    text,
  locale       text not null default 'en',
  status       text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error        text,
  sent_at      timestamptz
);

create index if not exists idx_ecr_campaign_pending
  on email_campaign_recipients (campaign_id) where status = 'pending';
create index if not exists idx_ec_due
  on email_campaigns (scheduled_at) where status in ('scheduled', 'sending');

alter table email_campaigns enable row level security;
alter table email_campaign_recipients enable row level security;
-- No policies on purpose: only the service role (bypasses RLS) may touch these.
