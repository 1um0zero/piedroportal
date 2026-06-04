-- ============================================================================
-- Migration 003 — Back-office order state columns
-- ============================================================================
--
-- Run this ONLY if the admin order workflow columns are missing. Quick test:
-- open /admin/orders as a Piedro admin — if the list is empty/broken while
-- orders exist, these columns are missing. This migration is idempotent
-- (IF NOT EXISTS), so it is safe to run even if some columns already exist.
--
-- Meaning of each column:
--   approval_state   — Piedro's review/approval pipeline state
--   production_state — manufacturing stage of the physical shoe
--   piedro_order_id  — the order's ID in Piedro's internal ERP (portal ↔ ERP link)
--   piedro_notes     — free-text internal notes by Piedro staff
-- The app keeps the simple orders.status in sync from these (see
-- updateOrderAdminAction in src/app/actions/admin-orders.ts).
-- ============================================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS approval_state   text DEFAULT 'registered';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS production_state text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS piedro_order_id  text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS piedro_notes     text;

-- Helps the back-office filter/sort by approval state.
CREATE INDEX IF NOT EXISTS idx_orders_approval_state ON orders (approval_state);

-- ============================================================================
-- Verify:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'orders'
--     AND column_name IN ('approval_state','production_state','piedro_order_id','piedro_notes');
-- Then open /admin/orders and /admin/orders/[id] and confirm the state
-- dropdowns load and save.
-- ============================================================================
