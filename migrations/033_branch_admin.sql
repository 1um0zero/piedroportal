-- ============================================================================
-- Migration 033 — Branch admins (order on behalf of a branch office's clients)
-- ============================================================================
--
-- IMPORTANT: Execute this migration in Supabase SQL Editor BEFORE deploying code.
--
-- Adds a NEW capability on top of migration 004's branch offices: a `branch_admin`
-- may create and view orders ON BEHALF of every client (company) linked to the
-- branch office(s) they administer. Two new N:N relationships:
--
--   branch_companies — the clients (companies) linked to a branch office.
--   branch_admins    — the users who administer a branch office. A branch may have
--                      several admins, and a user may administer several branches.
--
-- This is orthogonal to migration 004's `branch_staff` (single branch via
-- profiles.branch_id, catalogue scoping by model) — that stays untouched.
--
-- Access pattern: read/written ONLY via the service-role client (back-office and
-- the order flow). Following migration 002, no RLS — anon stays denied.
-- ============================================================================

-- ── branch_companies ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branch_companies (
  branch_id  UUID NOT NULL REFERENCES branches(id)  ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (branch_id, company_id)
);
CREATE INDEX IF NOT EXISTS idx_branch_companies_company ON branch_companies(company_id);

-- ── branch_admins ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branch_admins (
  branch_id  UUID NOT NULL REFERENCES branches(id)  ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (branch_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_branch_admins_user ON branch_admins(user_id);

-- ── role label ────────────────────────────────────────────────────────────────
COMMENT ON COLUMN profiles.role IS
  'Valid values: user, company_admin, piedro_admin, branch_staff, branch_admin, super_admin';

-- ============================================================================
-- Verification after running:
--   1. Link a client:  INSERT INTO branch_companies (branch_id, company_id) ...
--   2. Make customerservice@ a branch admin:
--        INSERT INTO branch_admins (branch_id, user_id)
--        SELECT '<branch-id>', id FROM profiles WHERE email = 'customerservice@piedro.com';
--      (the back-office /admin/branches/<id> UI also does both of the above)
--   3. Logged in as that user, the order form's client picker lists the branch's
--      clients, and /orders shows those clients' orders.
-- ============================================================================
