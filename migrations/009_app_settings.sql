-- ============================================================================
-- Migration 009 — App settings (admin-editable key/value config)
-- ============================================================================
--
-- Lets a piedro_admin configure things from the back-office instead of env vars.
-- First use: notification email recipients + sender.
--   order_notify_email  — where new submitted orders are emailed
--   admin_notify_email  — where new-user signups are emailed
--   email_from          — verified Resend sender, e.g. "Piedro Portal <noreply@piedro.com>"
-- Email senders read the DB value first, then fall back to the matching env var.
--
-- Service-role only (like migration 002): RLS on, no policies → anon/auth clients
-- can't read it; all access is server-side via the service client.
-- Idempotent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_settings (
  key        text PRIMARY KEY,
  value      text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
-- No policies on purpose — only the service role (which bypasses RLS) may access.

-- ============================================================================
-- Verify:
--   SELECT key, value FROM app_settings;
-- ============================================================================
