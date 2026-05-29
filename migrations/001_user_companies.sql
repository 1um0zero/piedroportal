-- ============================================================================
-- Migration: Create user_companies table for many-to-many user-company relationship
-- ============================================================================
--
-- IMPORTANT: Execute this migration in Supabase SQL Editor BEFORE deploying code
--
-- This migration:
-- 1. Creates user_companies table
-- 2. Migrates existing data from profiles.company_id
-- 3. Sets up proper indexes and constraints
--
-- After migration, each user can belong to multiple companies
-- and can be company_admin of some companies but not others
-- ============================================================================

-- Step 1: Create user_companies table
CREATE TABLE IF NOT EXISTS user_companies (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  is_company_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each user can only be associated once with each company
  PRIMARY KEY (user_id, company_id)
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_companies_user_id ON user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_company_id ON user_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_admin ON user_companies(user_id, company_id) WHERE is_company_admin = true;

-- Step 3: Migrate existing data from profiles.company_id to user_companies
-- Only migrate users that have a company_id set
INSERT INTO user_companies (user_id, company_id, is_company_admin)
SELECT
  id as user_id,
  company_id,
  CASE
    WHEN role = 'company_admin' THEN true
    ELSE false
  END as is_company_admin
FROM profiles
WHERE company_id IS NOT NULL
ON CONFLICT (user_id, company_id) DO NOTHING;

-- Step 4: Update profiles table - keep company_id for backwards compatibility (temporary)
-- We'll remove this column in a future migration after verifying everything works
COMMENT ON COLUMN profiles.company_id IS 'DEPRECATED: Use user_companies table instead. Will be removed in future migration.';

-- Step 5: Update profiles.role - remove 'company_admin' as it's now per-company
-- Keep only 'user' and 'piedro_admin' as valid roles
-- NOTE: This doesn't alter the column, just documents the new logic
COMMENT ON COLUMN profiles.role IS 'Valid values: user, piedro_admin. company_admin is now per-company via user_companies.is_company_admin';

-- ============================================================================
-- Verification Queries (run after migration to verify)
-- ============================================================================

-- Check how many users were migrated
-- SELECT COUNT(*) as migrated_users FROM user_companies;

-- Check company_admins
-- SELECT u.user_id, p.email, u.company_id, c.name as company_name
-- FROM user_companies u
-- JOIN profiles p ON u.user_id = p.id
-- JOIN companies c ON u.company_id = c.id
-- WHERE u.is_company_admin = true;

-- Check users with multiple companies (should be 0 initially)
-- SELECT user_id, COUNT(*) as company_count
-- FROM user_companies
-- GROUP BY user_id
-- HAVING COUNT(*) > 1;
