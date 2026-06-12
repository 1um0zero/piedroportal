-- ─────────────────────────────────────────────────────────────────────────────
-- 021 — Rich HTML email campaigns
--
-- body_html: sanitized HTML composed in the rich editor (logos / photos pasted
-- in are uploaded to the public `email-assets` storage bucket and referenced by
-- URL — e-mail clients block base64 images). `body` keeps the plain-text
-- version for the history list and as a fallback.
-- The custom signature lives in app_settings under `broadcast_signature_html`.
-- ─────────────────────────────────────────────────────────────────────────────

alter table email_campaigns add column if not exists body_html text;
