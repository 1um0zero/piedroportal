-- Migration 037 — production timeline (one event per stage, with REAL timestamp)
--
-- Until now the ERP only overwrote orders.production_state with the CURRENT
-- stage (last-write-wins): dangerous on back/forward moves, and blind to how
-- fast an order advances or where it stalls (bottlenecks).
--
-- This table records EACH production movement as an immutable event, stamped
-- with the real A-Shell timestamp (producao.data$ + hora$). Two uses:
--   1. New orders: every state update from the a-shell inserts an event.
--   2. Historical sweep: read `producao` per order and POST every movement
--      with its real occurred_at — the a-shell is the source of truth.
--
-- orders.production_state stays in sync = the latest event's stage, so the
-- existing grid/UI is untouched.
--
-- stage is the canonical value from FN'portal'production$ (portal1.bpi):
--   order_received, in_preparation, cutting, stitching, mounting, finishing,
--   fitting, delivered  — plus `dispatched` for the shipping event
--   (rotulos / doc'transporte'timestamp$).
--
-- Idempotent: the unique key means the historical sweep can run any number of
-- times without duplicating rows.
-- Run once in the Supabase SQL Editor.

create table if not exists public.order_production_events (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  stage       text not null,
  -- key parts NOT NULL DEFAULT '' so the unique constraint actually dedupes
  -- (Postgres treats NULL <> NULL, which would let duplicates through).
  seccao      text not null default '',     -- raw A-Shell seccao$ (detail/debug)
  posto       text not null default '',     -- raw A-Shell posto$
  es          text not null default '',     -- movement direction: 'E' entrada / 'S' saida
  qty         numeric,                      -- pares
  occurred_at timestamptz not null,         -- REAL stage timestamp (A-Shell data$+hora$)
  source      text default 'a-shell',       -- cl000 / ic0884 / rotulos / ...
  actor_user  text,                         -- A-Shell operator code (adm'user$)
  actor_name  text,
  recorded_at timestamptz not null default now(),
  -- one physical movement = one row (lets the historical sweep be re-run safely)
  constraint order_production_events_unique unique (order_id, seccao, posto, occurred_at, es)
);

create index if not exists ope_order_idx    on public.order_production_events(order_id);
create index if not exists ope_stage_idx    on public.order_production_events(stage);
create index if not exists ope_occurred_idx on public.order_production_events(occurred_at);

-- Written and read server-side via the service client (ERP endpoint + app-level
-- permission checks, same model as admin_actions). RLS on, no public policy.
alter table public.order_production_events enable row level security;
