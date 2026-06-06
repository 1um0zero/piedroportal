-- ============================================================================
-- Migration 007 — ERP (a-shell) order export tracking
-- ============================================================================
--
-- The a-shell ERP pulls new orders from the portal (replacing its old
-- Dataverse import). `erp_exported_at` is the "fetched" marker so the ERP
-- never imports the same order twice: the export endpoint can return only
-- orders WHERE erp_exported_at IS NULL, and the ERP acks them afterwards.
--
-- Idempotent. See docs/launch/ERP-INTEGRATION.md.
-- ============================================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS erp_exported_at timestamptz;

-- Fast lookup of not-yet-exported, submitted/approved orders.
CREATE INDEX IF NOT EXISTS idx_orders_erp_unexported
  ON orders (created_at)
  WHERE erp_exported_at IS NULL;

-- ============================================================================
-- Verify:
--   SELECT count(*) FILTER (WHERE erp_exported_at IS NULL) AS pending_export,
--          count(*) AS total
--   FROM orders;
-- ============================================================================
