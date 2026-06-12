-- ─────────────────────────────────────────────────────────────────────────────
-- 021 — Per-language campaign variants
--
-- email_campaigns.translations holds AI-proposed (admin-reviewed) translations
-- of the composed email, keyed by locale:
--   { "nl": { "subject": "...", "body": "<plain>", "body_html": "<html>" }, ... }
-- The processor sends each recipient the variant matching their
-- profiles.preferred_locale; missing locales fall back to the original.
-- ─────────────────────────────────────────────────────────────────────────────

alter table email_campaigns
  add column if not exists translations jsonb;
