-- ============================================================================
-- Migration 010 — Per-user and per-customer Cc/Bcc for order confirmations
-- ============================================================================
--
-- The client order confirmation is sent TO the ordering user by default; these
-- optional fields add extra Cc/Bcc recipients at the user and the company level.
-- Comma/semicolon/space-separated email lists.
--
-- Idempotent.
-- ============================================================================

ALTER TABLE profiles  ADD COLUMN IF NOT EXISTS notify_cc  text;
ALTER TABLE profiles  ADD COLUMN IF NOT EXISTS notify_bcc text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS notify_cc  text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS notify_bcc text;

-- ============================================================================
-- app_settings keys used alongside this (no schema needed — they are key/value):
--   notify_locale            — language of the INTERNAL Piedro notification email
--   set_password_title_<loc> / set_password_body_<loc> / reset_email_<loc>  (6.6)
-- ============================================================================
