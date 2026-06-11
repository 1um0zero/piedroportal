-- ============================================================================
-- 019 — stock_orders: add columns missing on the live table
-- The live stock_orders was created from an earlier draft of migration 017;
-- CREATE TABLE IF NOT EXISTS is a no-op on rerun, so columns added later to
-- the file (clinician etc.) never reached the database → PGRST204 on submit.
-- Idempotent: safe to run even if some columns already exist.
-- ============================================================================

ALTER TABLE stock_orders ADD COLUMN IF NOT EXISTS clinician          text;
ALTER TABLE stock_orders ADD COLUMN IF NOT EXISTS patient_name       text;
ALTER TABLE stock_orders ADD COLUMN IF NOT EXISTS reference_customer text;
ALTER TABLE stock_orders ADD COLUMN IF NOT EXISTS comments           text;
ALTER TABLE stock_orders ADD COLUMN IF NOT EXISTS locale             text NOT NULL DEFAULT 'en';
ALTER TABLE stock_orders ADD COLUMN IF NOT EXISTS approval_state     text DEFAULT 'registered';
ALTER TABLE stock_orders ADD COLUMN IF NOT EXISTS production_state   text;
ALTER TABLE stock_orders ADD COLUMN IF NOT EXISTS piedro_order_id    text;
ALTER TABLE stock_orders ADD COLUMN IF NOT EXISTS piedro_notes       text;
ALTER TABLE stock_orders ADD COLUMN IF NOT EXISTS expected_dispatch_date date;
ALTER TABLE stock_orders ADD COLUMN IF NOT EXISTS pdf_url            text;
ALTER TABLE stock_orders ADD COLUMN IF NOT EXISTS updated_at         timestamptz NOT NULL DEFAULT now();

-- Refresh the PostgREST schema cache so the API sees the new columns at once.
NOTIFY pgrst, 'reload schema';

-- Verify:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'stock_orders' ORDER BY ordinal_position;
