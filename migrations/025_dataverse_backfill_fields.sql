-- Migration 025 — columns for Dataverse data that the original order import skipped
-- Run once in the Supabase SQL Editor, then:
--   node scripts/backfill-order-erp-fields.mjs --apply
--
-- approval_date  : cr56f_date_approval — when Piedro approved the order (the
--                  ERP's prazo/dispatch maths started from this date, not createdon).
-- erp_order_ref  : cr56f_order_production — the a-shell console order number(s)
--                  the ERP wrote back (e.g. "24000123/24000124" when LF≠RF).
--                  This is the historical ERP↔portal cross-reference.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS approval_date timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS erp_order_ref text;
COMMENT ON COLUMN orders.approval_date IS 'When Piedro approved the order (Dataverse cr56f_date_approval; later set by the portal back-office).';
COMMENT ON COLUMN orders.erp_order_ref IS 'A-shell console order number(s) for this order (Dataverse cr56f_order_production; later via /api/erp/orders/status).';
