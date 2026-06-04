-- ============================================================================
-- Migration 004 — Branch offices (model-scoped back-office access)
-- ============================================================================
--
-- IMPORTANT: Execute this migration in Supabase SQL Editor BEFORE deploying code.
--
-- Introduces "branch offices" (regional offices: NL, UK, …) whose staff have a
-- back-office whose catalogue access is limited BY MODEL (= products.style_name,
-- without colour/version).
--
--   - Each branch has a boolean `sees_full_catalogue`:
--       true  → sees the whole catalogue EXCEPT a selected list of models
--               (branch_models = exclusions)
--       false → does NOT see the catalogue; sees ONLY a selected list of models
--               (branch_models = inclusions)
--   - Staff users belong to one branch via profiles.branch_id and get the new
--     role `branch_staff`. piedro_admin stays the global super-admin.
--
-- Access pattern: these tables are read/written ONLY via the service-role client
-- (back-office). Following migration 002, we do NOT add RLS policies — anon stays
-- denied and every privileged path uses the service role. products stays public.
-- ============================================================================

-- ── branches ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,                                      -- e.g. 'NL', 'UK'
  sees_full_catalogue BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── branch_models ────────────────────────────────────────────────────────────
-- Exclusions when the branch sees_full_catalogue, inclusions otherwise.
CREATE TABLE IF NOT EXISTS branch_models (
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  style_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (branch_id, style_name)
);
CREATE INDEX IF NOT EXISTS idx_branch_models_style ON branch_models(style_name);

-- ── profiles.branch_id ───────────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
COMMENT ON COLUMN profiles.role IS 'Valid values: user, company_admin, piedro_admin, branch_staff';
COMMENT ON COLUMN profiles.branch_id IS 'Branch office a branch_staff user belongs to (null for other roles).';

-- ============================================================================
-- Verification after running:
--   1. piedro_admin still sees the full back-office and /admin/branches.
--   2. A branch_staff with a sees_full_catalogue=false branch sees only the
--      models listed in branch_models for that branch under /admin/products.
--   3. A branch_staff with sees_full_catalogue=true sees all models except the
--      ones listed in branch_models for that branch.
--   4. Anonymous gallery still loads products (products has no RLS).
-- ============================================================================
