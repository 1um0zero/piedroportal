-- ============================================================================
-- Piedro Portal — combined migrations 006 → 012 (run as one block)
-- ============================================================================
-- Safe to run together: every statement is additive and idempotent. Does NOT
-- affect the currently deployed app; new features activate when the new code is
-- pushed. Run in the Supabase SQL Editor. Verify queries are at the bottom.
-- ============================================================================

-- ── 006 — Force password reset on first login ───────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS must_set_password boolean NOT NULL DEFAULT false;

-- ── 007 — ERP (a-shell) order export tracking ───────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS erp_exported_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_orders_erp_unexported
  ON orders (created_at)
  WHERE erp_exported_at IS NULL;

-- ── 008 — Reason an imported order has no user assigned ──────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS import_note text;
CREATE INDEX IF NOT EXISTS idx_orders_unassigned
  ON orders (created_at)
  WHERE user_id IS NULL;

-- ── 009 — App settings (admin-editable key/value config) ────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key        text PRIMARY KEY,
  value      text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
-- No policies on purpose — only the service role (which bypasses RLS) may access.

-- ── 010 — Per-user and per-customer Cc/Bcc for order confirmations ───────────
ALTER TABLE profiles  ADD COLUMN IF NOT EXISTS notify_cc  text;
ALTER TABLE profiles  ADD COLUMN IF NOT EXISTS notify_bcc text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS notify_cc  text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS notify_bcc text;

-- ── 011 — Per-branch notification config ────────────────────────────────────
ALTER TABLE branches ADD COLUMN IF NOT EXISTS notify_email  text;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS notify_locale text;

-- ── 012 — Self-owned password reset / first-login tokens ────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash text PRIMARY KEY,
  user_id    uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prt_user    ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_prt_expires ON password_reset_tokens (expires_at);
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
-- No policies — only the service role may access.

-- ============================================================================
-- Verify (expect: no errors; the columns/tables below should exist)
-- ============================================================================
-- SELECT column_name FROM information_schema.columns
--   WHERE (table_name='profiles'  AND column_name IN ('must_set_password','notify_cc','notify_bcc'))
--      OR (table_name='orders'    AND column_name IN ('erp_exported_at','import_note'))
--      OR (table_name='companies' AND column_name IN ('notify_cc','notify_bcc'))
--      OR (table_name='branches'  AND column_name IN ('notify_email','notify_locale'))
--   ORDER BY table_name, column_name;
-- SELECT to_regclass('public.app_settings') AS app_settings,
--        to_regclass('public.password_reset_tokens') AS reset_tokens;
-- ============================================================================
