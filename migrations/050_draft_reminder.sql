-- ============================================================================
-- Migration 050 — One-time draft reminder email
-- ============================================================================
--
-- Anabela (2026-07-13): a client had many orders sitting in draft, convinced
-- she had already submitted them. A daily cron (/api/cron/draft-reminder)
-- emails each user ONCE per draft, after the draft has had no activity for
-- app_settings.draft_reminder_days working days (default 2; 0 disables).
-- The stamp below is what guarantees "once": a draft with the column set is
-- never reminded again, even if it keeps sitting there.
-- ============================================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS draft_reminder_sent_at timestamptz;

-- Optional knob (the cron defaults to 2 when the key is absent):
--   INSERT INTO app_settings (key, value) VALUES ('draft_reminder_days', '2')
--   ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- Verify:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'orders' AND column_name = 'draft_reminder_sent_at';
-- ============================================================================
