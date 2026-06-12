-- Migration 024 — tracking code written by the ERP (a-shell)
-- The ERP sends carrier tracking via POST /api/erp/orders/status:
--   tracking_code (the carrier's code) + tracking_link (full URL, built ERP-side
--   from the carrier's link template). tracking_link already exists
--   (supabase-add-tracking.sql); this adds the raw code alongside it.
-- Run once in the Supabase SQL Editor.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_code text;
COMMENT ON COLUMN orders.tracking_code IS 'Carrier tracking code (written by the ERP via /api/erp/orders/status).';
