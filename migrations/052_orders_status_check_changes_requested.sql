-- ============================================================================
-- Migration 052 — Allow 'changes_requested' in orders.status CHECK constraint
-- ============================================================================
--
-- Migration 048 introduced the 'changes_requested' status ("request changes" /
-- reopen flow) and ASSUMED orders.status had no CHECK constraint. That was
-- wrong: the table carries an `orders_status_check` constraint (created outside
-- the tracked migrations, e.g. via the Supabase table editor) whose allowed set
-- predates 'changes_requested'. As a result, reopening an order fails with:
--     new row for relation "orders" violates check constraint "orders_status_check"
--
-- This migration rebuilds the constraint to match the canonical OrderStatus
-- enum in src/types/index.ts.
-- ============================================================================

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'draft',
    'submitted',
    'changes_requested',
    'approved',
    'in_production',
    'shipped',
    'delivered',
    'cancelled'
  ));

-- ============================================================================
-- Verify:
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conrelid = 'orders'::regclass AND conname = 'orders_status_check';
-- ============================================================================
