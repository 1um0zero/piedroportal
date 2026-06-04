-- ============================================================================
-- Migration 002 — Row-Level Security (defence-in-depth)
-- ============================================================================
--
-- ⚠️ RUN IN A STAGING/BRANCH DATABASE AND TEST THE FULL APP BEFORE PRODUCTION.
--
-- The application accesses the database in two ways:
--   1. Service-role client (server-only) — BYPASSES RLS. Used for all admin
--      operations, order reads/writes, and profile/company management.
--   2. User-session client (anon key + the signed-in user's JWT) — SUBJECT to
--      RLS. Used for: reading the user's own profile, the user's own
--      user_companies, and (for piedro_admins) listing companies.
--
-- These policies grant exactly what path (2) needs and nothing more. Because
-- every privileged/cross-tenant operation goes through the service role, RLS
-- here is a safety net: if a query is ever accidentally issued with the anon
-- key, it cannot leak another tenant's data.
--
-- NOTE: products and translations are intentionally left without RLS — they are
-- the public catalogue read by anonymous gallery visitors.
-- ============================================================================

-- ── profiles ────────────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- A user may read only their own profile. Admin reads use the service role.
DROP POLICY IF EXISTS profiles_select_own ON profiles;
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- No INSERT/UPDATE/DELETE policies on purpose: profile creation happens via the
-- signup trigger (SECURITY DEFINER) and all updates go through the service role
-- with a field whitelist, so users can never change their own role.

-- ── user_companies ──────────────────────────────────────────────────────────
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_companies_select_own ON user_companies;
CREATE POLICY user_companies_select_own ON user_companies
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
-- All writes to membership are admin-only via the service role.

-- ── orders ──────────────────────────────────────────────────────────────────
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Extra safety net: a user can read only their own orders if a query ever runs
-- with the anon key. Company-admin and Piedro-admin views use the service role.
DROP POLICY IF EXISTS orders_select_own ON orders;
CREATE POLICY orders_select_own ON orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
-- No write policies: all order writes go through hardened server actions using
-- the service role (which validate company ownership and status).

-- ── companies ───────────────────────────────────────────────────────────────
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Company names are low-sensitivity business data; the admin order form lists
-- them with the user-session client. Restrict to authenticated users.
DROP POLICY IF EXISTS companies_select_authenticated ON companies;
CREATE POLICY companies_select_authenticated ON companies
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================================
-- Verification after running:
--   1. Sign in as a regular user → can open Gallery, place/view OWN orders.
--   2. Sign in as a company_admin → can view their companies' orders.
--   3. Sign in as a piedro_admin → admin dashboard, all orders, /admin/users work.
--   4. Profile edit + avatar upload still work.
--   5. Anonymous gallery still loads products.
-- If anything 403s/empties unexpectedly, the offending read is using the anon
-- key where it should use the service role — fix that read, do not loosen RLS.
-- ============================================================================
