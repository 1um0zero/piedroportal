-- 056_drop_deleted_orders.sql
-- Reverses 054. Decision (Jorge, 2026-07-15): a deletion must leave a LOG (what/who/when),
-- not a content archive. The deleted_orders snapshot preserved order content (patient data,
-- additions) beyond intent and against RGPD data-minimisation for orders a client chose to
-- delete. The trace now lives only in admin_actions.order_delete (identifiers only), and the
-- order's PDF is removed from storage on delete.
--
-- PREREQ: run scripts/cleanup-deleted-orders.mjs --apply FIRST. It folds the 13 existing
-- deleted_orders rows into admin_actions (identifiers only) and deletes the 13 orphan PDFs,
-- so dropping this table loses no "was-deleted" record.

drop table if exists public.deleted_orders;
