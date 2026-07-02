-- 047_message_templates.sql
-- Reusable message templates (subject + rich HTML body + signature + per-locale
-- variants) authored in the /admin/message-templates configurator and consumed
-- both by the broadcast tool and by any feature that sends templated emails.
-- RLS on, no policies → service-role only (all access is server-side).

create table if not exists message_templates (
  id            uuid primary key default gen_random_uuid(),
  -- Stable slug for programmatic lookup, e.g. renderTemplate('order_confirmation').
  key           text unique not null,
  name          text not null,
  description   text,
  category      text,
  subject       text not null default '',
  body_html     text not null default '',
  -- Per-template signature override; null → shared global broadcast signature.
  signature_html text,
  -- Declared {{variable}} names the template expects (documentation + UI hints).
  variables     text[] not null default '{}',
  -- Per-locale overrides: { "nl": { "subject": "...", "body_html": "..." }, ... }
  translations  jsonb,
  active        boolean not null default true,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists message_templates_active_idx on message_templates (active);

alter table message_templates enable row level security;
