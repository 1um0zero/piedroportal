-- Carrier tracking link on orders (from Dataverse cr56f_trackinglink; later ERP).
-- Run once in the Supabase SQL Editor, then: node scripts/backfill-order-tracking.mjs
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_link text;
COMMENT ON COLUMN orders.tracking_link IS 'Carrier tracking URL (Dataverse cr56f_trackinglink, later the ERP).';
