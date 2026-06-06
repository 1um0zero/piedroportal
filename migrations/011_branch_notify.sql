-- ============================================================================
-- Migration 011 — Per-branch notification config (branch = a config scope)
-- ============================================================================
--
-- A branch office overrides/replicates global config. For order emails: each
-- branch whose model-scope covers an order's product receives a copy in its OWN
-- language, to its OWN address. (See the architecture note in PROJECT-TRACKER §15.)
--   notify_email  — where this branch's order copies go (blank = none)
--   notify_locale — language for this branch's copies (en/nl/fr/de; default en)
--
-- Idempotent.
-- ============================================================================

ALTER TABLE branches ADD COLUMN IF NOT EXISTS notify_email  text;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS notify_locale text;

-- ============================================================================
-- Verify:
--   SELECT name, notify_email, notify_locale FROM branches;
-- ============================================================================
