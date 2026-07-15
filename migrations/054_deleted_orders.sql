-- 054_deleted_orders.sql
-- Immutable archive of deleted orders — "no order that ever existed may vanish without a trace".
--
-- The client hard-delete path (deleteOrderAction) permanently removed the orders row AND, for a
-- REAL (non-impersonated) client, logged NOTHING: logOnBehalf() no-ops outside impersonation, so a
-- client deleting their own pre-intervention order left zero audit trail. A submitted order thus
-- disappeared leaving only an orphan PDF in the `order-pdfs` bucket and a gap in order_seq
-- (e.g. #4980, #4992 — both were submitted, tested for the changes-request flow, then deleted).
--
-- From now on deleteOrderAction snapshots the ENTIRE orders row into this table BEFORE removing it,
-- and refuses the delete if the archive write fails (fail-closed). There is deliberately NO foreign
-- key to orders — the whole point is to outlive the row. Append-only, service-role only.

create table if not exists public.deleted_orders (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null,            -- original orders.id (no FK: the row is deleted)
  order_seq        integer,                  -- human order number, if one had been assigned (on submit)
  status           text,                     -- order status at the moment of deletion
  user_id          uuid,                     -- order creator
  company_id       uuid,
  patient_name     text,                     -- surfaced for quick lookup; also inside snapshot
  reference_customer text,
  deleted_by       uuid,                     -- who triggered the delete (the real actor)
  deleted_by_role  text,
  impersonated_as  uuid,                     -- set when deleted while acting-as another user
  reason           text,                     -- e.g. 'client_hard_delete', 'orphan_pdf_reconstruction'
  pdf_url          text,                     -- surviving PDF path in order-pdfs, if any
  snapshot         jsonb not null,           -- the ENTIRE orders row (or best reconstruction) at deletion
  deleted_at       timestamptz not null default now()
);

create index if not exists deleted_orders_seq_idx  on public.deleted_orders(order_seq);
create index if not exists deleted_orders_user_idx on public.deleted_orders(user_id);
create index if not exists deleted_orders_at_idx   on public.deleted_orders(deleted_at desc);

-- RLS on, no policies: only the service role (server actions / scripts) may read or write.
alter table public.deleted_orders enable row level security;
