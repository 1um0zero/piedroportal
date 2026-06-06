-- ============================================================================
-- Migration 008 — Reason an imported order has no user assigned
-- ============================================================================
--
-- After the user backfill, some migrated (step-3) orders may still have
-- user_id = null because their owner contact couldn't be resolved (no contact
-- on the order, contact not migrated, or a cross-check rejection). This column
-- records WHY, so the back-office "Unassigned orders" list can explain each one.
--
-- Idempotent. Set by scripts/backfill-order-users.mjs.
-- ============================================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS import_note text;

CREATE INDEX IF NOT EXISTS idx_orders_unassigned
  ON orders (created_at)
  WHERE user_id IS NULL;

-- ============================================================================
-- Verify (the back-office list query):
--   SELECT id, company_id, reference_customer, import_note
--   FROM orders WHERE user_id IS NULL ORDER BY created_at DESC;
-- ============================================================================
