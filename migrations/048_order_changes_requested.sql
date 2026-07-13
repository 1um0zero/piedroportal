-- ============================================================================
-- Migration 048 — Reopen orders for client edits ("changes requested")
-- ============================================================================
--
-- Staff with the approval capability can put a submitted/approved order (not
-- yet in production) into status 'changes_requested'. That state lets the user
-- who CREATED the order edit it in the order form and re-submit it — keeping
-- the same order number (order_seq is never re-minted). On re-submit the order
-- returns to 'submitted', approval goes back to triage ('registered') and
-- erp_exported_at is cleared so the VSI console re-imports the corrected data.
--
-- orders.status has no CHECK constraint (verified: no migration defines one),
-- so the new value needs no constraint change. These columns carry the last
-- reopen's context; the full history lives in admin_actions ('order_reopen').
-- ============================================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS reopened_at   timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reopened_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reopen_reason text;

-- ============================================================================
-- Verify:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'orders'
--     AND column_name IN ('reopened_at','reopened_by','reopen_reason');
-- And confirm no status CHECK constraint exists (should return 0 rows):
--   SELECT conname FROM pg_constraint
--   WHERE conrelid = 'orders'::regclass AND contype = 'c'
--     AND pg_get_constraintdef(oid) ILIKE '%status%';
-- ============================================================================
