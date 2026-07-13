-- ============================================================================
-- Migration 049 — Reopened-order lifecycle: replacement chain + follow-up
-- ============================================================================
--
-- Completes the changes_requested flow (048):
--   • Re-submitting a reopened order now CANCELS the original and creates a
--     NEW order (new order_seq) — the ERP-clean practice (void + re-import)
--     instead of mutating an order the VSI console already registered. The
--     two orders reference each other:
--       new.replaces_order_id     → the cancelled original
--       old.replaced_by_order_id  → the corrected replacement
--   • reopen_reminder_sent_at — bookkeeping for the daily follow-up cron
--     (/api/cron/reopen-followup): reminder after N working days, automatic
--     cancellation after M working days without a client response
--     (app_settings reopen_reminder_days / reopen_cancel_days, default 3/10).
-- ============================================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS replaces_order_id       uuid REFERENCES orders(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS replaced_by_order_id    uuid REFERENCES orders(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reopen_reminder_sent_at timestamptz;

-- ============================================================================
-- Verify:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'orders'
--     AND column_name IN ('replaces_order_id','replaced_by_order_id','reopen_reminder_sent_at');
-- ============================================================================
