-- ============================================================================
-- Migration 043 — allow 'staff_viewer' in the profiles.role CHECK constraint
-- ============================================================================
--
-- IMPORTANT: Execute this in the Supabase SQL Editor BEFORE deploying the code
-- that lets the back-office assign the role (otherwise the UPDATE silently fails,
-- exactly as branch_admin did before migration 035).
--
-- staff_viewer = a GLOBAL, READ-ONLY consultant of orders (e.g. VSI staff): may
-- open /admin/orders (list + detail), including UK and VSI-direct orders, but can
-- write nothing and has no other back-office area. It is the first role on the new
-- "read-only" permission axis (scope without write). See project_staff_viewer.
-- ============================================================================

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'company_admin', 'piedro_admin', 'branch_staff', 'branch_admin', 'super_admin', 'staff_viewer'));

COMMENT ON COLUMN profiles.role IS
  'Valid values: user, company_admin, piedro_admin, branch_staff, branch_admin, super_admin, staff_viewer';

-- ============================================================================
-- Verify:
--   SELECT email, role FROM profiles WHERE role = 'staff_viewer';
-- ============================================================================
