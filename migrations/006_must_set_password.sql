-- ============================================================================
-- Migration 006 — Force password reset on first login (clean user migration)
-- ============================================================================
--
-- Migrated Power Pages users are created in Supabase Auth with a random password
-- (no invite email). On their first login they must set their own password.
-- This flag drives the middleware guard + /set-password flow.
--
-- Idempotent. Run in Supabase SQL Editor before importing contacts.
-- ============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS must_set_password boolean NOT NULL DEFAULT false;

-- ============================================================================
-- Verify:
--   SELECT count(*) FILTER (WHERE must_set_password) AS pending_reset,
--          count(*) AS total
--   FROM profiles;
-- ============================================================================
