-- ============================================================================
-- Migration 035 — allow 'branch_admin' in the profiles.role CHECK constraint
-- ============================================================================
--
-- IMPORTANT: Execute this in the Supabase SQL Editor.
--
-- Migration 033 added the branch_admin CAPABILITY (branch_admins table) and the
-- role label in the column COMMENT, but the actual CHECK constraint
-- (profiles_role_check, last set in migration 013) never listed 'branch_admin'.
-- So `UPDATE profiles SET role='branch_admin'` silently failed — including the
-- role stamp inside addBranchAdmin — leaving branch admins stuck on their old
-- role (e.g. branch_staff with no branch_id, which the back-office guard then
-- bounces out of /admin/orders). This widens the constraint and promotes the
-- branch admins that couldn't be stamped before.
-- ============================================================================

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'company_admin', 'piedro_admin', 'branch_staff', 'branch_admin', 'super_admin'));

-- Promote anyone who is a branch admin (branch_admins row) but is still on a low
-- role the stamp couldn't set. Never touch higher roles.
UPDATE profiles p
SET role = 'branch_admin', branch_id = NULL
WHERE p.id IN (SELECT user_id FROM branch_admins)
  AND p.role IN ('user', 'branch_staff');

-- ============================================================================
-- Verify:
--   SELECT email, role, branch_id FROM profiles
--   WHERE id IN (SELECT user_id FROM branch_admins);
--   -- customerservice@piedro.com should now be role=branch_admin, branch_id=null.
-- ============================================================================
