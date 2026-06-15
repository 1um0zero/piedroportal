-- ============================================================================
-- Migration 034 — Branch "catch-all" clients
-- ============================================================================
--
-- IMPORTANT: Execute this migration in Supabase SQL Editor BEFORE deploying code.
--
-- Adds a per-branch flag: when `handles_unassigned_clients` is true, that branch's
-- admins also consider as their clients EVERY company that is not explicitly linked
-- (branch_companies) to ANY branch. Explicit branch_companies links still apply on
-- top. This mirrors migration 004's sees_full_catalogue idea, but for clients.
--
-- Typically a single "default" branch (e.g. NL) carries this flag. Several branches
-- may carry it — each then sees the same unassigned pool (overlap allowed).
-- ============================================================================

ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS handles_unassigned_clients BOOLEAN NOT NULL DEFAULT false;

-- ============================================================================
-- Verify:
--   SELECT name, handles_unassigned_clients FROM branches;
-- ============================================================================
