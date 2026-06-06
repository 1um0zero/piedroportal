-- ============================================================================
-- Migration 012 — Self-owned password reset / first-login tokens
-- ============================================================================
--
-- We send our OWN (editable, multi-lingual) reset email instead of Supabase's
-- template. Security model:
--   • only the SHA-256 HASH of the token is stored (never the raw token);
--   • single-use (claimed atomically via used_at) + short expiry;
--   • consuming sets the password via the service role (admin API).
-- Service-role only (RLS on, no policies). See src/lib/password-reset.ts.
-- Idempotent.
-- ============================================================================

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
-- No policies — only the service role (which bypasses RLS) may access.

-- Optional housekeeping (run periodically): delete expired/used tokens.
--   DELETE FROM password_reset_tokens WHERE expires_at < now() OR used_at IS NOT NULL;
-- ============================================================================
