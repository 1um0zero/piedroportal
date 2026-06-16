-- 036_admin_actions.sql
-- Back-office audit trail. Until now only the chat (chat_logs) and page_views were
-- logged — administrative mutations on orders (cancel, approval/production state
-- changes, Piedro Order # assignment) left no trace. For MDR / ISO 13485
-- traceability every such action must be attributable to an actor and a moment.
--
-- This is an append-only log: rows are never updated or deleted by the app.

create table if not exists public.admin_actions (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references auth.users(id) on delete set null,
  actor_role  text,
  action      text not null,                                   -- e.g. 'order_cancel', 'order_update'
  order_id    uuid references public.orders(id) on delete set null,
  details     jsonb,                                           -- action-specific payload (reason, before/after…)
  created_at  timestamptz not null default now()
);

create index if not exists admin_actions_order_idx  on public.admin_actions(order_id);
create index if not exists admin_actions_actor_idx  on public.admin_actions(actor_id);
create index if not exists admin_actions_created_idx on public.admin_actions(created_at desc);

-- RLS on, no policies: only the service role (server actions) may read/write.
alter table public.admin_actions enable row level security;
