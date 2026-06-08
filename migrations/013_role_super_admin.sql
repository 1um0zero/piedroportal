-- 013_role_super_admin.sql
-- Allow the new infrastructure/technical role `super_admin` on profiles.role.
--
-- profiles.role has a CHECK constraint (profiles_role_check) that currently permits
-- only user | company_admin | piedro_admin | branch_staff. Recreate it to also allow
-- super_admin (a strict superset of piedro_admin — see src/lib/roles.ts).
--
-- Run this in the Supabase SQL Editor, then grant the role:
--   node scripts/set-admin.mjs tavares@umzero.pt super_admin

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'company_admin', 'piedro_admin', 'branch_staff', 'super_admin'));

-- Verify:
--   SELECT role, count(*) FROM profiles GROUP BY role ORDER BY role;
