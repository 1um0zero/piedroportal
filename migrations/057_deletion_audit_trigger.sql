-- 057_deletion_audit_trigger.sql
-- Portal-wide backstop for Jorge's rule: NO deletion may be invisible. Even a manual SQL
-- delete, a forgotten app path, or a cascade must leave a trace of WHAT was deleted and WHEN.
--
-- This is a DB-level guarantee independent of the app: an AFTER DELETE trigger on every entity
-- table writes one row to deletion_log. It is EVENT-ONLY (identifiers, never content — RGPD):
-- table name, the row's id, a best-effort non-sensitive label, the timestamp, and the DB role.
-- If the log write fails the whole delete transaction rolls back (fail-closed).
--
-- WHO (the app user) is captured separately by the app layer (admin_actions), because server
-- actions run under the service role, so current_user here is the DB role, not the end user.
-- The two together: this trigger guarantees the event is recorded; admin_actions attributes it.

create table if not exists public.deletion_log (
  id          uuid primary key default gen_random_uuid(),
  table_name  text        not null,
  row_pk      text,                       -- the deleted row's id (or composite marker)
  row_label   text,                       -- non-sensitive identifier hint (order_seq / name / email…)
  db_role     text        not null default current_user,
  txid        bigint      not null default txid_current(),
  deleted_at  timestamptz not null default now()
);
create index if not exists deletion_log_table_idx on public.deletion_log(table_name);
create index if not exists deletion_log_at_idx    on public.deletion_log(deleted_at desc);

alter table public.deletion_log enable row level security;  -- no policies: service role only

-- Trigger function. SECURITY DEFINER so it can always write to deletion_log regardless of the
-- deleting role's RLS. Pulls only non-sensitive identity columns for the label — deliberately
-- NOT patient_name or any clinical field.
create or replace function public.audit_deletion() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  j jsonb := to_jsonb(OLD);
begin
  insert into public.deletion_log (table_name, row_pk, row_label)
  values (
    tg_table_name,
    coalesce(j->>'id', j->>'order_id', '(composite)'),
    coalesce(j->>'order_seq', j->>'name', j->>'title', j->>'label',
             j->>'email', j->>'reference_customer', j->>'date', j->>'style_name')
  );
  return OLD;
end $$;

-- Attach to the entity tables whose deletion must never be invisible. Housekeeping/leaf tables
-- (product_stock size-zero cleanup, etc.) are intentionally omitted to keep the log signal-rich;
-- add more here if a table's deletions must be tracked.
do $$
declare t text;
begin
  foreach t in array array[
    'orders','profiles','companies','branches','branch_companies','user_companies',
    'announcements','message_templates','lab_sheets','factory_closures',
    'addition_field_options','stock_orders','email_campaigns'
  ] loop
    if to_regclass('public.'||t) is not null then
      execute format('drop trigger if exists trg_audit_delete on public.%I', t);
      execute format('create trigger trg_audit_delete after delete on public.%I
                      for each row execute function public.audit_deletion()', t);
    end if;
  end loop;
end $$;
